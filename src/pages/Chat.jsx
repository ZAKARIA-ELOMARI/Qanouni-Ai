import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Divider,
    Avatar,
    Menu,
    MenuItem,
    AppBar,
    Toolbar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import MenuIcon from '@mui/icons-material/Menu';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import api from '../config/api';

const Chat = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token) {
            navigate('/login');
            return;
        }
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
        fetchConversations();
    }, []);

    useEffect(() => {
        if (currentConversation) {
            fetchMessages(currentConversation);
        }
    }, [currentConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            const response = await api.get('/conversations');
            setConversations(response.data.conversations);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    const fetchMessages = async (conversationId) => {
        try {
            const response = await api.get(`/conversations/${conversationId}`);
            setMessages(response.data.messages || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleDeleteConversation = async (conversationId) => {
        try {
            await api.delete(`/conversations/${conversationId}`);
            setConversations(conversations.filter(conv => conv.id !== conversationId));
            if (currentConversation === conversationId) {
                setCurrentConversation(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    };

    const startNewConversation = async () => {
        try {
            const newConversation = await api.post('/conversations', { title: 'Nouvelle conversation' });
            setCurrentConversation(newConversation.data.conversation.id);
            setConversations([newConversation.data.conversation, ...conversations]);
            setMessages([]);
        } catch (error) {
            console.error('Error creating new conversation:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const newMessage = { content: message, is_bot: false };
        setMessages([...messages, newMessage]);
        setMessage('');
        setLoading(true);

        try {
            let conversationId = currentConversation;
            if (!conversationId) {
                const newConversation = await api.post('/conversations', { title: 'Nouvelle conversation' });
                conversationId = newConversation.data.conversation.id;
                setCurrentConversation(conversationId);
                setConversations([newConversation.data.conversation, ...conversations]);
            }

            const response = await api.post(`/conversations/${conversationId}/messages`, {
                message,
                useFileAssistant: true,
            });

            setMessages([...messages, newMessage, { content: response.data.message.content, is_bot: true }]);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleMenuOpen = (event) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleEditTitle = () => {
        setIsEditingTitle(true);
        setNewTitle(conversations.find(c => c.id === currentConversation)?.title || '');
        handleMenuClose();
    };

    const handleTitleSubmit = async () => {
        if (newTitle.trim() && currentConversation) {
            try {
                await api.put(`/conversations/${currentConversation}`, { title: newTitle.trim() });
                setConversations(conversations.map(conv => 
                    conv.id === currentConversation 
                        ? { ...conv, title: newTitle.trim() } 
                        : conv
                ));
            } catch (error) {
                console.error('Error updating conversation title:', error);
            }
        }
        setIsEditingTitle(false);
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            {/* Navigation Bar */}
            <AppBar 
                position="static" 
                sx={{ 
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
                elevation={0}
            >
                <Toolbar sx={{ 
                    minHeight: '64px',
                    display: 'flex',
                    justifyContent: 'space-between',
                }}>
                    {/* Logo et Titre */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <IconButton
                            onClick={toggleSidebar}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': {
                                    color: 'primary.main'
                                }
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <SmartToyIcon sx={{ 
                            color: 'primary.main',
                            fontSize: 32
                        }} />
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                color: 'text.primary',
                                fontWeight: 'bold',
                                display: { xs: 'none', sm: 'block' }
                            }}
                        >
                            ChatBot Juridique Marocain
                        </Typography>
                    </Box>

                    {/* User Info et Logout */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1
                        }}>
                            <Avatar 
                                sx={{ 
                                    bgcolor: 'primary.main',
                                    width: 32,
                                    height: 32
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase() || <PersonIcon />}
                            </Avatar>
                            <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                    color: 'text.primary',
                                    display: { xs: 'none', sm: 'block' }
                                }}
                            >
                                {user?.username || 'Utilisateur'}
                            </Typography>
                        </Box>
                        <IconButton 
                            onClick={handleLogout}
                            sx={{ 
                                color: 'text.secondary',
                                '&:hover': {
                                    color: 'primary.main'
                                }
                            }}
                        >
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar */}
                <Box sx={{ 
                    width: isSidebarOpen ? 300 : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.sidebar',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    transition: 'width 0.3s ease',
                    overflow: 'hidden'
                }}>
                    {/* New Chat Button */}
                    <Box sx={{ p: 2 }}>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={startNewConversation}
                            sx={{
                                justifyContent: 'flex-start',
                                mb: 1,
                                py: 1,
                            }}
                        >
                            Nouvelle conversation
                        </Button>
                    </Box>

                    {/* Conversations List */}
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <List>
                            {conversations.map((conv) => (
                                <ListItem
                                    key={conv.id}
                                    button
                                    selected={currentConversation === conv.id}
                                    onClick={() => setCurrentConversation(conv.id)}
                                    sx={{
                                        mb: 0.5,
                                        borderRadius: 1,
                                        mx: 1,
                                        '&.Mui-selected': {
                                            backgroundColor: 'rgba(0, 166, 126, 0.1)',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0, 166, 126, 0.2)',
                                            },
                                        },
                                    }}
                                    secondaryAction={
                                        <IconButton 
                                            edge="end" 
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteConversation(conv.id);
                                            }}
                                            sx={{ 
                                                opacity: 0,
                                                transition: '0.2s',
                                                '.MuiListItem-root:hover &': {
                                                    opacity: 1,
                                                }
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    }
                                >
                                    <ChatIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                    <ListItemText 
                                        primary={conv.title}
                                        secondary={formatDate(conv.updated_at)}
                                        primaryTypographyProps={{
                                            noWrap: true,
                                            color: 'text.primary'
                                        }}
                                        secondaryTypographyProps={{
                                            noWrap: true,
                                            fontSize: '0.75rem'
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>

                    {/* Logout Button */}
                    <Box sx={{ 
                        p: 2, 
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            mb: 2
                        }}>
                            <Avatar 
                                sx={{ 
                                    bgcolor: 'primary.main',
                                    width: 40,
                                    height: 40
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase() || <PersonIcon />}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" noWrap>
                                    {user?.username || 'Utilisateur'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {user?.email}
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="inherit"
                            startIcon={<LogoutIcon />}
                            onClick={handleLogout}
                            sx={{ 
                                justifyContent: 'flex-start',
                                color: 'text.secondary',
                                borderColor: 'divider',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    bgcolor: 'rgba(0, 166, 126, 0.08)',
                                }
                            }}
                        >
                            Déconnexion
                        </Button>
                    </Box>
                </Box>

                {/* Chat Area */}
                <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    bgcolor: 'background.chat'
                }}>
                    {/* Messages Area */}
                    <Box sx={{ 
                        flex: 1, 
                        overflow: 'auto', 
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}>
                        {messages.length === 0 ? (
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'text.secondary'
                            }}>
                                <ChatIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                <Typography variant="h6">
                                    Commencez une nouvelle conversation
                                </Typography>
                                <Typography>
                                    Posez votre question juridique...
                                </Typography>
                            </Box>
                        ) : (
                            messages.map((msg, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: msg.is_bot ? 'flex-start' : 'flex-end',
                                    }}
                                >
                                    <Paper
                                        sx={{
                                            p: 2,
                                            maxWidth: '70%',
                                            bgcolor: msg.is_bot ? 'background.paper' : 'primary.main',
                                            color: msg.is_bot ? 'text.primary' : 'white',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography>{msg.content}</Typography>
                                    </Paper>
                                </Box>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Message Input */}
                    <Box sx={{ 
                        p: 2, 
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                    }}>
                        <form onSubmit={handleSubmit}>
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 1,
                                maxWidth: '800px',
                                mx: 'auto'
                            }}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Tapez votre message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={loading}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                        }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading || !message.trim()}
                                    sx={{ 
                                        minWidth: '50px',
                                        height: '56px',
                                        borderRadius: 2
                                    }}
                                >
                                    <SendIcon />
                                </Button>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default Chat; 