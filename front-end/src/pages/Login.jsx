import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    TextField, 
    Button, 
    Container, 
    Box, 
    Typography, 
    Paper, 
    Avatar, 
    Fade,
    IconButton,
    InputAdornment,
    Checkbox,
    FormControlLabel,
    CircularProgress,
    Link
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import api from '../config/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const getErrorMessage = (error) => {
        if (!error.response) {
            return "Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.";
        }

        const status = error.response.status;
        const message = error.response?.data?.message;

        switch (status) {
            case 400:
                return "Les informations fournies sont incorrectes. Veuillez vérifier vos identifiants.";
            case 401:
                return "Email ou mot de passe incorrect. Veuillez réessayer.";
            case 403:
                return "Accès refusé. Veuillez contacter l'administrateur.";
            case 404:
                return "Service temporairement indisponible. Veuillez réessayer plus tard.";
            case 500:
                return "Une erreur est survenue sur nos serveurs. Veuillez réessayer plus tard.";
            default:
                return message || "Une erreur inattendue s'est produite. Veuillez réessayer.";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!email || !password) {
            setError("Veuillez remplir tous les champs obligatoires.");
            setIsLoading(false);
            return;
        }

        if (!email.includes('@')) {
            setError("Veuillez saisir une adresse email valide.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await api.post('/login', { 
                email, 
                password,
                remember: rememberMe 
            });
            
            if (response.data.success) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }
                navigate('/chat');
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Fade in={true} timeout={800}>
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                    p: 3,
                    backgroundImage: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
                }}
            >
                <Container maxWidth="sm">
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            p: { xs: 3, sm: 4 },
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: (theme) => theme.shadows[6],
                            },
                        }}
                    >
                        <Box
                            sx={{
                                mb: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <Avatar
                                sx={{
                                    mb: 2,
                                    bgcolor: 'primary.main',
                                    width: 64,
                                    height: 64,
                                    boxShadow: 2,
                                }}
                            >
                                <SmartToyIcon sx={{ fontSize: 40 }} />
                            </Avatar>
                            <Typography
                                variant="h4"
                                align="center"
                                gutterBottom
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 700,
                                    letterSpacing: '-0.5px',
                                    mb: 1,
                                }}
                            >
                                ChatBot Juridique
                            </Typography>
                            <Typography
                                variant="subtitle1"
                                align="center"
                                sx={{
                                    color: 'text.secondary',
                                    mb: 3,
                                    maxWidth: '80%',
                                }}
                            >
                                Votre assistant juridique intelligent au Maroc
                            </Typography>
                        </Box>

                        {error && (
                            <Fade in={true}>
                                <Typography 
                                    color="error" 
                                    align="center" 
                                    gutterBottom
                                    sx={{ 
                                        mb: 2,
                                        bgcolor: 'error.light',
                                        color: 'error.main',
                                        p: 2,
                                        borderRadius: 1,
                                        width: '100%',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {error}
                                </Typography>
                            </Fade>
                        )}

                        <Box 
                            component="form" 
                            onSubmit={handleSubmit}
                            sx={{
                                width: '100%',
                                mt: 1
                            }}
                        >
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Adresse email"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        '&:hover fieldset': {
                                            borderColor: 'primary.main',
                                        },
                                    },
                                }}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Mot de passe"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={handleTogglePasswordVisibility}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 1,
                                    '& .MuiOutlinedInput-root': {
                                        '&:hover fieldset': {
                                            borderColor: 'primary.main',
                                        },
                                    },
                                }}
                            />

                            <Box sx={{ mb: 3, mt: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            value="remember"
                                            color="primary"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            disabled={isLoading}
                                        />
                                    }
                                    label="Se souvenir de moi"
                                />
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isLoading}
                                sx={{ 
                                    mb: 2,
                                    height: '48px',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    boxShadow: 2,
                                    position: 'relative',
                                    '&:hover': {
                                        boxShadow: 4,
                                    },
                                }}
                            >
                                {isLoading ? (
                                    <CircularProgress
                                        size={24}
                                        sx={{
                                            color: 'primary.light',
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            marginTop: '-12px',
                                            marginLeft: '-12px',
                                        }}
                                    />
                                ) : (
                                    'Se connecter'
                                )}
                            </Button>

                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => navigate('/signup')}
                                disabled={isLoading}
                                sx={{
                                    height: '48px',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                        borderColor: 'primary.dark',
                                    },
                                }}
                            >
                                Créer un compte
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </Fade>
    );
};

export default Login; 