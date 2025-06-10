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
    Stack,
    Tooltip,
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import api, { exportConversation } from '../config/api';
import { keyframes } from '@mui/system';
import CircularProgress from '@mui/material/CircularProgress';
import ReactMarkdown from 'react-markdown';

// Function to remove source citations like 【4:0†source】
const removeSourceCitations = (text) => {
    if (!text) return text;
    // Remove citations in the format 【number:number†source】
    return text.replace(/【\d+:\d+†source】/g, '');
};

// Animation du pulse
const pulse = keyframes`
    0% { transform: scale(1); opacity: 0.4; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 0.4; }
`;

// Animation d'apparition des messages
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

// Composant d'animation de chargement professionnel
const LoadingAnimation = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                maxWidth: '70%',
            }}
        >
            {/* Avatar du Bot */}
            <Avatar
                sx={{
                    bgcolor: 'primary.main',
                    width: 40,
                    height: 40,
                }}
            >
                <SmartToyIcon sx={{ fontSize: 24 }} />
            </Avatar>

            {/* Contenu du message de chargement */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, primary.main, transparent)',
                        animation: `${pulse} 1.5s infinite`,
                    }
                }}
            >
                <CircularProgress
                    size={20}
                    thickness={4}
                    sx={{
                        color: 'primary.main',
                        opacity: 0.7
                    }}
                />
                <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}
                >
                    Génération de la réponse
                </Typography>
            </Paper>
        </Box>
    );
};

// Styles pour les messages
const messageStyles = {
    botMessage: {
        '& pre': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            padding: '1rem',
            borderRadius: '8px',
            overflowX: 'auto',
            margin: '0.5rem 0',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: '0.9rem',
        },
        '& code': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
        },
        '& h3': {
            mt: 2,
            mb: 1.5,
            fontSize: '1.25rem',
            fontWeight: 600,
            borderBottom: '1px solid',
            borderColor: 'divider',
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '&::before': {
                content: '""',
                width: '4px',
                height: '1.25rem',
                backgroundColor: 'primary.main',
                borderRadius: '2px',
                display: 'inline-block',
            },
        },
        '& ul, & ol': {
            pl: 3,
            mb: 1.5,
            '& li::marker': {
                color: 'primary.main',
            },
        },
        '& li': {
            mb: 1,
            pl: 1,
        },
        '& p': {
            mb: 1.5,
            lineHeight: 1.6,
            '&:last-child': {
                mb: 0,
            },
        },
        '& strong': {
            fontWeight: 600,
            color: 'primary.main',
            backgroundColor: 'rgba(0, 166, 126, 0.08)',
            padding: '0.1rem 0.3rem',
            borderRadius: '4px',
        },
        '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            ml: 0,
            pl: 2,
            py: 0.5,
            backgroundColor: 'rgba(0, 166, 126, 0.08)',
            borderRadius: '4px',
        },
    },
    userMessage: {
        '& strong': {
            color: 'inherit',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        '& h3': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
            '&::before': {
                backgroundColor: 'white',
            },
        },
        '& blockquote': {
            borderColor: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        '& li::marker': {
            color: 'white',
        },
    },
};

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
    const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
    const [currentSuggestionSet, setCurrentSuggestionSet] = useState(0);
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const [exporting, setExporting] = useState(false);

    const allSuggestions = [
        // Set 1
        [
            "Comment créer une entreprise au Maroc ?",
            "Quels sont mes droits en cas de licenciement ?",
            "Comment légaliser un document administratif ?",
            "Quelles sont les étapes d'un divorce au Maroc ?"
        ],
        // Set 2
        [
            "Quelles sont les conditions pour obtenir la nationalité marocaine ?",
            "Comment déposer une plainte au Maroc ?",
            "Quels sont les droits des locataires ?",
            "Comment protéger une marque au Maroc ?"
        ],
        // Set 3
        [
            "Quelles sont les procédures d'héritage au Maroc ?",
            "Comment créer une association ?",
            "Quels sont les droits des femmes au travail ?",
            "Comment obtenir un casier judiciaire ?"
        ]
    ];

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

    useEffect(() => {
        if (!currentConversation) {
            setCurrentSuggestionSet((prev) => (prev + 1) % allSuggestions.length);
        }
    }, [currentConversation]);

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

    const updateConversationTitle = async (conversationId, messageContent) => {
        try {
            // Créer un titre significatif à partir du message
            let title = messageContent
                .split('?')[0] // Prendre la première phrase jusqu'au point d'interrogation
                .split('.')[0] // Ou jusqu'au point
                .trim();

            // Limiter la longueur du titre
            title = title.length > 40 ? title.substring(0, 40) + '...' : title;

            // Ajouter une icône appropriée en fonction du contenu
            if (title.toLowerCase().includes('droit')) {
                title = '⚖️ ' + title;
            } else if (title.toLowerCase().includes('loi')) {
                title = '📜 ' + title;
            } else if (title.toLowerCase().includes('justice')) {
                title = '🏛️ ' + title;
            } else {
                title = '💬 ' + title;
            }

            // Mettre à jour le titre dans la base de données
            const response = await api.put(`/conversations/${conversationId}`, { title });

            // Mettre à jour l'état local des conversations
            setConversations(prevConversations => 
                prevConversations.map(conv =>
                    conv.id === conversationId
                        ? { ...conv, title: response.data.title || title }
                        : conv
                )
            );
        } catch (error) {
            console.error('Error updating conversation title:', error);
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
            let isNewConversation = false;

            if (!conversationId) {
                // Créer une nouvelle conversation avec le message comme titre
                const title = message.length > 40 ? message.substring(0, 40) + '...' : message;
                const newConversation = await api.post('/conversations', {
                    title: title
                });
                conversationId = newConversation.data.conversation.id;
                setCurrentConversation(conversationId);
                setConversations(prev => [{
                    ...newConversation.data.conversation,
                    title: title
                }, ...prev]);
                isNewConversation = true;
            }

            // Envoyer le message
            const response = await api.post(`/conversations/${conversationId}/messages`, {
                message,
                useFileAssistant: true,
            });

            // Mettre à jour les messages
            setMessages(prev => [...prev, { content: response.data.message.content, is_bot: true }]);

            // Si c'est une nouvelle conversation, on a déjà défini le titre avec le premier message
            if (!isNewConversation) {
                // Pour les conversations existantes, on peut mettre à jour le titre si nécessaire
                await updateConversationTitle(conversationId, message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'À l\'instant';
        
        try {
            const date = new Date(dateString);
            
            // Vérifier si la date est valide
            if (isNaN(date.getTime())) {
                return 'À l\'instant';
            }

            return new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (error) {
            return 'Date inconnue';
        }
    };

    // Export conversation handlers
    const handleOpenExportMenu = (event) => {
        setExportAnchorEl(event.currentTarget);
    };

    const handleCloseExportMenu = () => {
        setExportAnchorEl(null);
    };

    const handleExportConversation = async (format = 'json') => {
        if (!currentConversation) return;
        
        try {
            setExporting(true);
            const response = await exportConversation(currentConversation, format);
            
            // Create a download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `conversation_${currentConversation}.${format}`);
            document.body.appendChild(link);
            link.click();
            
            // Clean up and remove the link
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting conversation:', error);
        } finally {
            setExporting(false);
            handleCloseExportMenu();
        }
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

    const handleSuggestionClick = (question) => {
        setMessage(question);
    };

    // Fonction pour afficher les messages avec l'avatar
    const renderMessage = (msg, index) => {
        const isArabic = /[\u0600-\u06FF]/.test(msg.content);
        const isLastMessage = index === messages.length - 1;
        
        return (
            <Box
                key={index}
                sx={{
                    display: 'flex',
                    flexDirection: msg.is_bot ? 'row' : 'row-reverse',
                    alignItems: 'flex-start',
                    gap: 2,
                    mb: 3,
                    animation: isLastMessage ? `${fadeIn} 0.3s ease-out` : 'none',
                }}
            >
                <Box sx={{ position: 'relative' }}>
                    <Avatar
                        sx={{
                            bgcolor: msg.is_bot ? 'primary.main' : 'secondary.main',
                            width: 40,
                            height: 40,
                            boxShadow: 2,
                        }}
                    >
                        {msg.is_bot ? <SmartToyIcon /> : user?.username?.charAt(0).toUpperCase() || <PersonIcon />}
                    </Avatar>
                    {msg.is_bot && (
                        <Typography
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                mt: 0.5,
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Assistant
                        </Typography>
                    )}
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        maxWidth: '70%',
                        bgcolor: msg.is_bot ? 'background.paper' : 'primary.main',
                        color: msg.is_bot ? 'text.primary' : 'white',
                        borderRadius: '12px',
                        boxShadow: msg.is_bot ? 
                            '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' : 
                            '0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.2)',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 16,
                            [msg.is_bot ? 'left' : 'right']: -6,
                            width: 12,
                            height: 12,
                            bgcolor: msg.is_bot ? 'background.paper' : 'primary.main',
                            transform: 'rotate(45deg)',
                            boxShadow: msg.is_bot ?
                                '-1px 1px 2px rgba(0,0,0,0.05)' :
                                '1px -1px 2px rgba(0,0,0,0.1)',
                        },
                        direction: isArabic ? 'rtl' : 'ltr',
                        textAlign: isArabic ? 'right' : 'left',
                        fontFamily: isArabic ? 
                            "'Noto Sans Arabic', 'Segoe UI', sans-serif" : 
                            "'Segoe UI', sans-serif",
                        ...messageStyles.botMessage,
                        ...(msg.is_bot ? {} : messageStyles.userMessage),
                    }}
                >
                    <ReactMarkdown
                        components={{
                            h3: ({node, ...props}) => (
                                <Typography variant="h3" component="h3" {...props} />
                            ),
                            p: ({node, ...props}) => (
                                <Typography 
                                    variant="body1" 
                                    sx={{ fontSize: '0.95rem' }} 
                                    {...props} 
                                />
                            ),
                            li: ({node, ...props}) => (
                                <Typography 
                                    component="li" 
                                    variant="body1" 
                                    sx={{ fontSize: '0.95rem' }} 
                                    {...props} 
                                />
                            ),
                            text: ({node, ...props}) => {
                                if (props.children === '0') return null;
                                return <span {...props} />;
                            }
                        }}
                    >
                        {removeSourceCitations(msg.content)}
                    </ReactMarkdown>
                </Paper>
            </Box>
        );
    };

    const SuggestedQuestions = () => (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, sm: 4 },
                height: '100%',
                maxWidth: '900px',
                margin: '0 auto',
            }}
        >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Avatar
                    sx={{
                        bgcolor: 'primary.main',
                        width: 56,
                        height: 56,
                        mb: 2,
                        mx: 'auto',
                        boxShadow: 2,
                    }}
                >
                    <SmartToyIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography 
                    variant="h5" 
                    sx={{ 
                        color: 'primary.main', 
                        fontWeight: 600,
                        mb: 1.5
                    }}
                >
                    Votre Assistant Juridique Marocain
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: 'text.secondary',
                        mb: 4,
                        maxWidth: '600px',
                        mx: 'auto',
                        lineHeight: 1.6
                    }}
                >
                    Je suis là pour répondre à vos questions sur le droit marocain et vous aider dans vos démarches juridiques.
                </Typography>
                <Typography 
                    variant="subtitle1" 
                    sx={{ 
                        color: 'text.primary',
                        fontWeight: 500,
                        mb: 2
                    }}
                >
                    Commencez avec une de ces questions :
                </Typography>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)'
                    },
                    gap: 2,
                    width: '100%',
                }}
            >
                {allSuggestions[currentSuggestionSet].map((question, index) => (
                    <Paper
                        key={index}
                        elevation={0}
                        onClick={() => handleSuggestionClick(question)}
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                            minHeight: '80px',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'primary.50',
                                transform: 'translateY(-2px)',
                                boxShadow: 1,
                            },
                        }}
                    >
                        <LightbulbOutlinedIcon 
                            sx={{ 
                                color: 'primary.main',
                                fontSize: 20,
                                mt: 0.3,
                                flexShrink: 0
                            }}
                        />
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.primary',
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                            }}
                        >
                            {question}
                        </Typography>
                    </Paper>
                ))}
            </Box>
        </Box>
    );

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
                    </Box>                    {/* User Info et Navigation */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 2
                    }}>
                        {/* Navigation Links */}
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1
                        }}>
                            <IconButton 
                                onClick={() => navigate('/files')}
                                sx={{ 
                                    color: 'text.secondary',
                                    '&:hover': {
                                        color: 'primary.main'
                                    }
                                }}
                                title="Gérer les fichiers"
                            >
                                <FolderIcon />
                            </IconButton>                            <IconButton 
                                onClick={() => navigate('/profile')}
                                sx={{ 
                                    color: 'text.secondary',
                                    '&:hover': {
                                        color: 'primary.main'
                                    }
                                }}
                                title="Mon profil"
                            >
                                <AccountCircleIcon />
                            </IconButton>
                            {user?.is_admin === true && (
                                <IconButton 
                                    onClick={() => navigate('/admin')}
                                    sx={{ 
                                        color: 'text.secondary',
                                        '&:hover': {
                                            color: 'primary.main'
                                        }
                                    }}
                                    title="Administration"
                                >
                                    <AdminPanelSettingsIcon />
                                </IconButton>
                            )}
                        </Box>
                        
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
                            onClick={() => {
                                setCurrentConversation(null);
                                setMessages([]);
                            }}
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
                                    onClick={() => {
                                        setCurrentConversation(conv.id);
                                        fetchMessages(conv.id);
                                    }}
                                    sx={{
                                        mb: 0.5,
                                        borderRadius: 1,
                                        mx: 1,
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        pl: currentConversation === conv.id ? 3 : 2,
                                        backgroundColor: currentConversation === conv.id ? 
                                            'rgba(0, 166, 126, 0.15)' : 
                                            'transparent',
                                        borderLeft: currentConversation === conv.id ? 
                                            '4px solid' : 
                                            '4px solid transparent',
                                        borderColor: currentConversation === conv.id ? 
                                            'primary.main' : 
                                            'transparent',
                                        '&:hover': {
                                            backgroundColor: currentConversation === conv.id ? 
                                                'rgba(0, 166, 126, 0.2)' : 
                                                'rgba(0, 166, 126, 0.1)',
                                        },
                                        cursor: 'default',
                                        '& .MuiListItemText-root': {
                                            cursor: 'default'
                                        }
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
                                    <ChatIcon sx={{ 
                                        mr: 2, 
                                        color: 'text.secondary',
                                    }} />
                                    <ListItemText 
                                        primary={conv.title}
                                        secondary={formatDate(conv.updated_at)}
                                        primaryTypographyProps={{
                                            noWrap: true,
                                            color: 'text.primary',
                                            fontWeight: currentConversation === conv.id ? 500 : 400
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
                </Box>                {/* Chat Area */}
                <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    bgcolor: 'background.chat'
                }}>
                    {/* Chat Header - Only show when there's a conversation */}
                    {currentConversation && (
                        <Box sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 3,
                            py: 1.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ChatIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                                {isEditingTitle ? (
                                    <TextField
                                        size="small"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        autoFocus
                                        onBlur={() => {
                                            if (newTitle.trim()) {
                                                setIsUpdatingTitle(true);
                                                api.put(`/conversations/${currentConversation}`, { title: newTitle.trim() })
                                                    .then(response => {
                                                        setConversations(prevConversations => 
                                                            prevConversations.map(conv =>
                                                                conv.id === currentConversation
                                                                    ? { ...conv, title: newTitle.trim() }
                                                                    : conv
                                                            )
                                                        );
                                                    })
                                                    .catch(error => console.error('Error updating title:', error))
                                                    .finally(() => {
                                                        setIsUpdatingTitle(false);
                                                        setIsEditingTitle(false);
                                                    });
                                            } else {
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newTitle.trim()) {
                                                e.preventDefault();
                                                e.target.blur();
                                            } else if (e.key === 'Escape') {
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                        InputProps={{
                                            endAdornment: isUpdatingTitle && (
                                                <CircularProgress size={20} sx={{ color: 'primary.main' }} />
                                            )
                                        }}
                                        sx={{ minWidth: 200 }}
                                    />
                                ) : (
                                    <Typography 
                                        variant="subtitle1"
                                        sx={{ 
                                            fontWeight: 500,
                                            color: 'text.primary'
                                        }}
                                    >
                                        {conversations.find(c => c.id === currentConversation)?.title || 'Conversation'}
                                    </Typography>
                                )}
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {!isEditingTitle && (
                                    <>
                                        <Tooltip title="Modifier le titre">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => {
                                                    setNewTitle(conversations.find(c => c.id === currentConversation)?.title || '');
                                                    setIsEditingTitle(true);
                                                }}
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    '&:hover': { color: 'primary.main' }
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        
                                        <Tooltip title="Exporter la conversation">
                                            <IconButton 
                                                size="small"
                                                onClick={handleOpenExportMenu}
                                                disabled={exporting}
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    '&:hover': { color: 'primary.main' }
                                                }}
                                            >
                                                <FileDownloadIcon fontSize="small" />
                                                {exporting && (
                                                    <CircularProgress
                                                        size={24}
                                                        sx={{
                                                            position: 'absolute',
                                                            color: 'primary.main',
                                                        }}
                                                    />
                                                )}
                                            </IconButton>
                                        </Tooltip>
                                        
                                        <Menu
                                            anchorEl={exportAnchorEl}
                                            open={Boolean(exportAnchorEl)}
                                            onClose={handleCloseExportMenu}
                                            anchorOrigin={{
                                                vertical: 'bottom',
                                                horizontal: 'right',
                                            }}
                                            transformOrigin={{
                                                vertical: 'top',
                                                horizontal: 'right',
                                            }}
                                        >
                                            <MenuItem onClick={() => handleExportConversation('json')} disabled={exporting}>
                                                Exporter en JSON
                                            </MenuItem>
                                            <MenuItem onClick={() => handleExportConversation('txt')} disabled={exporting}>
                                                Exporter en Texte
                                            </MenuItem>
                                            <MenuItem onClick={() => handleExportConversation('md')} disabled={exporting}>
                                                Exporter en Markdown
                                            </MenuItem>
                                        </Menu>
                                    </>
                                )}
                            </Box>
                        </Box>
                    )}
                    
                    {/* Messages Area */}
                    <Box sx={{ 
                        flex: 1, 
                        overflow: 'auto', 
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        {messages.length === 0 ? (
                            <SuggestedQuestions />
                        ) : (
                            <>
                                {messages.map((msg, index) => renderMessage(msg, index))}
                                {loading && <LoadingAnimation />}
                            </>
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
                                    placeholder={loading ? "Génération en cours..." : "Posez votre question juridique..."}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={loading}
                                    autoComplete="off"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (message.trim() && !loading) {
                                                handleSubmit(e);
                                            }
                                        }
                                    }}
                                    inputProps={{
                                        autoComplete: 'off',
                                        form: {
                                            autoComplete: 'off',
                                        },
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            transition: 'all 0.3s ease',
                                            ...(loading && {
                                                opacity: 0.7,
                                            })
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
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        ...(loading && {
                                            opacity: 0.7,
                                        }),
                                        '&:not(:disabled):hover': {
                                            transform: 'translateY(-1px)',
                                            boxShadow: 2,
                                        }
                                    }}
                                >
                                    <SendIcon />
                                </Button>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Box>

            {/* Ajout des polices pour l'arabe dans le head */}
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600&display=swap"
            />
        </Box>
    );
};

export default Chat;