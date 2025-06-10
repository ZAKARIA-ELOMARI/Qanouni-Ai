import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Avatar,
    Container,
    Alert,
    CircularProgress,
    AppBar,
    Toolbar,
    IconButton,
    Grid,
    Divider,
    Stack,
    InputAdornment
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { getProfile, updateProfile } from '../config/api';

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await getProfile();
            if (response.data.success) {
                setProfile(response.data.profile);                setFormData({
                    username: response.data.profile.username,
                    email: response.data.profile.email,
                    password: '',
                    confirmPassword: ''
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError('Erreur lors de la récupération du profil.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
        setSuccess('');
    };    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username.trim() || !formData.email.trim()) {
            setError('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        if (!formData.email.includes('@')) {
            setError('Veuillez saisir une adresse email valide.');
            return;
        }

        // Check password validation only if password field is filled
        if (formData.password) {
            if (formData.password.length < 8) {
                setError('Le mot de passe doit contenir au moins 8 caractères.');
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                setError('Les mots de passe ne correspondent pas.');
                return;
            }
        }

        // Prepare data to submit (exclude confirmPassword field)
        const dataToSubmit = {
            username: formData.username,
            email: formData.email
        };

        // Only include password if it was provided
        if (formData.password) {
            dataToSubmit.password = formData.password;
        }

        try {
            setUpdating(true);
            setError('');
            const response = await updateProfile(dataToSubmit);
            
            if (response.data.success) {
                setProfile(response.data.profile);
                setSuccess('Profil mis à jour avec succès !');
                setEditMode(false);
                
                // Clear password fields
                setFormData(prev => ({
                    ...prev,
                    password: '',
                    confirmPassword: ''
                }));
                
                // Update user in localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({
                    ...user,
                    username: response.data.profile.username,
                    email: response.data.profile.email
                }));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.response?.status === 409) {
                setError('Cette adresse email est déjà utilisée.');
            } else {
                setError(error.response?.data?.message || 'Erreur lors de la mise à jour du profil.');
            }
        } finally {
            setUpdating(false);
        }
    };const handleCancel = () => {
        setFormData({
            username: profile.username,
            email: profile.email,
            password: '',
            confirmPassword: ''
        });
        setEditMode(false);
        setError('');
        setSuccess('');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Non disponible';
        try {
            return new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(dateString));
        } catch (error) {
            return 'Non disponible';
        }
    };

    if (loading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                bgcolor: 'background.default'
            }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            {/* App Bar */}
            <AppBar 
                position="static" 
                sx={{ 
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
                elevation={0}
            >                <Toolbar>
                    <IconButton 
                        edge="start" 
                        onClick={() => navigate('/chat')}
                        sx={{ color: 'text.primary', mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            color: 'text.primary',
                            fontWeight: 600,
                            flex: 1
                        }}
                    >
                        Mon Profil
                    </Typography>
                    {profile?.is_admin === true && (
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
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper
                    elevation={2}
                    sx={{
                        p: 4,
                        borderRadius: 2,
                        bgcolor: 'background.paper'
                    }}
                >
                    {/* Profile Header */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 4,
                        flexDirection: { xs: 'column', sm: 'row' },
                        textAlign: { xs: 'center', sm: 'left' }
                    }}>
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'primary.main',
                                fontSize: '2rem',
                                mr: { xs: 0, sm: 3 },
                                mb: { xs: 2, sm: 0 }
                            }}
                        >
                            {profile?.username?.charAt(0).toUpperCase() || <PersonIcon />}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" sx={{ 
                                color: 'text.primary',
                                fontWeight: 600,
                                mb: 1
                            }}>
                                {profile?.username || 'Utilisateur'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {profile?.email}
                            </Typography>
                        </Box>
                        {!editMode && (
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => setEditMode(true)}
                                sx={{ 
                                    mt: { xs: 2, sm: 0 },
                                    borderColor: 'primary.main',
                                    color: 'primary.main'
                                }}
                            >
                                Modifier
                            </Button>
                        )}
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    {/* Alerts */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {success}
                        </Alert>
                    )}                    {/* Profile Form */}
                    <Box component="form" onSubmit={handleSubmit}>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Nom d'utilisateur"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    disabled={!editMode || updating}
                                    variant="outlined"
                                    size="large"
                                    sx={{ mb: 3 }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Adresse email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={!editMode || updating}
                                    variant="outlined"
                                    size="large"
                                    sx={{ mb: 3 }}
                                />
                            </Grid><Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Date de création"
                                    value={formatDate(profile?.created_at)}
                                    disabled
                                    variant="outlined"
                                    size="large"
                                    sx={{ mb: 3 }}
                                />
                            </Grid>
                            {editMode && (
                                <>                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Nouveau mot de passe"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={handleChange}
                                            disabled={updating}
                                            variant="outlined"
                                            size="large"
                                            sx={{ mb: 3 }}
                                            helperText="Laissez vide pour conserver votre mot de passe actuel"
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={togglePasswordVisibility}
                                                            edge="end"
                                                            disabled={updating}
                                                            sx={{ 
                                                                color: 'text.secondary',
                                                                '&:hover': {
                                                                    color: 'primary.main'
                                                                }
                                                            }}
                                                        >
                                                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Confirmer le nouveau mot de passe"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            disabled={updating || !formData.password}
                                            variant="outlined"
                                            size="large"
                                            sx={{ mb: 3 }}
                                            error={formData.password && formData.password !== formData.confirmPassword}
                                            helperText={formData.password && formData.password !== formData.confirmPassword ? 
                                                "Les mots de passe ne correspondent pas" : ""}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">                                                <IconButton
                                                            onClick={toggleConfirmPasswordVisibility}
                                                            edge="end"
                                                            disabled={updating || !formData.password}
                                                            sx={{ 
                                                                color: 'text.secondary',
                                                                '&:hover': {
                                                                    color: 'primary.main'
                                                                }
                                                            }}
                                                        >
                                                            {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Grid>
                                </>
                            )}
                            </Grid>

                        {/* Action Buttons */}
                        {editMode && (
                            <Stack 
                                direction="row" 
                                spacing={2} 
                                sx={{ 
                                    mt: 4,
                                    justifyContent: 'flex-end'
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    startIcon={<CancelIcon />}
                                    onClick={handleCancel}
                                    disabled={updating}
                                    sx={{ 
                                        borderColor: 'text.secondary',
                                        color: 'text.secondary'
                                    }}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={updating ? <CircularProgress size={16} /> : <SaveIcon />}
                                    disabled={updating}
                                    sx={{ 
                                        bgcolor: 'primary.main',
                                        '&:hover': {
                                            bgcolor: 'primary.dark'
                                        }
                                    }}
                                >
                                    {updating ? 'Enregistrement...' : 'Enregistrer'}
                                </Button>
                            </Stack>
                        )}
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Profile;
