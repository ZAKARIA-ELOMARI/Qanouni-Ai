import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    AppBar,
    Toolbar,
    Alert,
    CircularProgress,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Tooltip,
    Container,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    ArrowBack as ArrowBackIcon,
    AdminPanelSettings as AdminIcon,
    Chat as ChatIcon,
    Description as FileIcon,
    Storage as StorageIcon,
    TrendingUp as TrendingUpIcon,
    Person as PersonIcon,
    Email as EmailIcon,    CalendarToday as CalendarIcon,
    CloudUpload as UploadIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { getAdminStats, getAllUsers, getUserDetails, deleteUser } from '../config/api';

const Admin = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token) {
            navigate('/login');
            return;
        }
        
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUser(userData);
                  // Check if user is admin
                if (userData.is_admin !== true) {
                    navigate('/chat');
                    return;
                }
                
                // User is admin, fetch data
                fetchAdminData();
            } catch (error) {
                console.error('Error parsing user data:', error);
                navigate('/login');
                return;
            }
        } else {
            navigate('/login');
            return;
        }
    }, [navigate]);

    const fetchAdminData = async () => {
        try {
            setLoading(true);
            const [statsResponse, usersResponse] = await Promise.all([
                getAdminStats(),
                getAllUsers()
            ]);
            
            setStats(statsResponse.data.stats);
            setUsers(usersResponse.data.users);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            setError('Erreur lors du chargement des données administrateur');
        } finally {
            setLoading(false);
        }
    };

    const handleUserDetails = async (userId) => {
        try {
            const response = await getUserDetails(userId);
            setSelectedUser(response.data.user);
            setDetailsDialogOpen(true);
        } catch (error) {
            console.error('Error fetching user details:', error);
            setError('Erreur lors du chargement des détails utilisateur');
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        try {
            await deleteUser(userToDelete.id);
            setUsers(users.filter(user => user.id !== userToDelete.id));
            setDeleteDialogOpen(false);
            setUserToDelete(null);
            
            // Refresh stats
            const statsResponse = await getAdminStats();
            setStats(statsResponse.data.stats);
        } catch (error) {
            console.error('Error deleting user:', error);
            setError('Erreur lors de la suppression de l\'utilisateur');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Navigation Bar */}
            <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        onClick={() => navigate('/chat')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <AdminIcon sx={{ mr: 2 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Panneau d'Administration
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                            {user?.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="subtitle2">
                            {user?.username}
                        </Typography>
                        <IconButton color="inherit" onClick={handleLogout}>
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {/* Statistics Cards */}
                {stats && (
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="overline">
                                                Utilisateurs Total
                                            </Typography>
                                            <Typography variant="h4">
                                                {stats.total_users}
                                            </Typography>
                                            <Typography color="textSecondary" variant="body2">
                                                {stats.admin_users} admin(s)
                                            </Typography>
                                        </Box>
                                        <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="overline">
                                                Conversations
                                            </Typography>
                                            <Typography variant="h4">
                                                {stats.total_conversations}
                                            </Typography>
                                            <Typography color="textSecondary" variant="body2">
                                                {stats.total_messages} messages
                                            </Typography>
                                        </Box>
                                        <ChatIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="overline">
                                                Fichiers
                                            </Typography>
                                            <Typography variant="h4">
                                                {stats.total_files}
                                            </Typography>
                                            <Typography color="textSecondary" variant="body2">
                                                {formatFileSize(stats.total_file_size)}
                                            </Typography>
                                        </Box>
                                        <FileIcon sx={{ fontSize: 40, color: 'success.main' }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" gutterBottom variant="overline">
                                                Utilisateurs Actifs
                                            </Typography>
                                            <Typography variant="h4">
                                                {stats.active_users}
                                            </Typography>
                                            <Typography color="textSecondary" variant="body2">
                                                {stats.recent_users} récents
                                            </Typography>
                                        </Box>
                                        <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Users Table */}
                <Paper sx={{ overflow: 'hidden' }}>
                    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PeopleIcon />
                            Gestion des Utilisateurs
                        </Typography>
                    </Box>
                    
                    <TableContainer>
                        <Table>                            <TableHead>
                                <TableRow>
                                    <TableCell>Utilisateur</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell align="center">Type</TableCell>
                                    <TableCell align="center">Conversations</TableCell>
                                    <TableCell align="center">Stockage</TableCell>
                                    <TableCell align="center">Inscrit</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Typography variant="subtitle2">
                                                    {user.username}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={user.is_admin ? 'Admin' : 'Utilisateur'}
                                                color={user.is_admin ? 'error' : 'default'}
                                                size="small"
                                            />                                        </TableCell>
                                        <TableCell align="center">{user.conversation_count}</TableCell>
                                        <TableCell align="center">
                                            {formatFileSize(user.total_file_size)}
                                        </TableCell>
                                        <TableCell align="center">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Voir détails">
                                                <IconButton 
                                                    onClick={() => handleUserDetails(user.id)}
                                                    size="small"
                                                    color="primary"
                                                >
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Tooltip>
                                            {!user.is_admin && (
                                                <Tooltip title="Supprimer utilisateur">
                                                    <IconButton 
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        size="small"
                                                        color="error"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>

            {/* User Details Dialog */}
            <Dialog 
                open={detailsDialogOpen} 
                onClose={() => setDetailsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {selectedUser?.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        Détails de {selectedUser?.username}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedUser && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Informations générales
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemIcon>
                                                <PersonIcon />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Nom d'utilisateur"
                                                secondary={selectedUser.username}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <EmailIcon />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Email"
                                                secondary={selectedUser.email}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CalendarIcon />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Inscrit le"
                                                secondary={formatDate(selectedUser.created_at)}
                                            />
                                        </ListItem>
                                    </List>
                                </Paper>
                                
                                <Paper sx={{ p: 2, mt: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Statistiques
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="primary">
                                                    {selectedUser.conversation_count}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Conversations
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="secondary">
                                                    {selectedUser.message_count}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Messages
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="success.main">
                                                    {selectedUser.file_count}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Fichiers
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="warning.main">
                                                    {formatFileSize(selectedUser.total_file_size)}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Stockage
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                {selectedUser.conversations && selectedUser.conversations.length > 0 && (
                                    <Paper sx={{ p: 2, mb: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Conversations récentes
                                        </Typography>
                                        <List dense>
                                            {selectedUser.conversations.slice(0, 5).map((conv, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <ChatIcon />
                                                    </ListItemIcon>
                                                    <ListItemText 
                                                        primary={conv.title}
                                                        secondary={formatDate(conv.updated_at)}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                )}
                                
                                {selectedUser.files && selectedUser.files.length > 0 && (
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Fichiers uploadés
                                        </Typography>
                                        <List dense>
                                            {selectedUser.files.map((file, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <FileIcon />
                                                    </ListItemIcon>
                                                    <ListItemText 
                                                        primary={file.original_name}
                                                        secondary={`${formatFileSize(file.file_size)} - ${formatDate(file.uploaded_at)}`}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsDialogOpen(false)}>
                        Fermer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogContent>
                    <Typography>
                        Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.username}</strong> ?
                        Cette action supprimera également toutes ses conversations, messages et fichiers.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Annuler
                    </Button>
                    <Button onClick={handleDeleteUser} color="error" variant="contained">
                        Supprimer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Admin;
