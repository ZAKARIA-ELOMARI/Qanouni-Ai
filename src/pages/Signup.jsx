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
    CircularProgress,
    Alert,
    Stack,
    LinearProgress
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import api from '../config/api';

const Signup = () => {
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const passwordRequirements = [
        { regex: /.{8,}/, text: "Au moins 8 caractères" },
        { regex: /[A-Z]/, text: "Au moins une majuscule" },
        { regex: /[a-z]/, text: "Au moins une minuscule" },
        { regex: /[0-9]/, text: "Au moins un chiffre" },
        { regex: /[^A-Za-z0-9]/, text: "Au moins un caractère spécial" }
    ];

    const getPasswordStrength = (password) => {
        let strength = 0;
        passwordRequirements.forEach(requirement => {
            if (requirement.regex.test(password)) {
                strength += 1;
            }
        });
        return (strength / passwordRequirements.length) * 100;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.nom || !formData.prenom || !formData.email || !formData.password || !formData.confirmPassword) {
            setError("Veuillez remplir tous les champs obligatoires.");
            return false;
        }

        if (!formData.email.includes('@')) {
            setError("Veuillez saisir une adresse email valide.");
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return false;
        }

        if (getPasswordStrength(formData.password) < 60) {
            setError("Le mot de passe ne respecte pas les critères de sécurité requis.");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/register', {
                username: `${formData.prenom} ${formData.nom}`, // ← clé attendue par le back
                email: formData.email,
                password: formData.password
            });

            if (response.data.success) {
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            }
        } catch (err) {
            console.error('Signup error:', err);
            if (err.response?.status === 409) {
                setError("Cette adresse email est déjà utilisée.");
            } else if (err.response?.status === 400) {
                setError("Les données fournies sont invalides. Veuillez vérifier vos informations.");
            } else if (!err.response) {
                setError("Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.");
            } else {
                setError(err.response?.data?.message || "Une erreur est survenue lors de l'inscription. Veuillez réessayer.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(formData.password);

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
                        <Avatar
                            sx={{
                                mb: 2,
                                bgcolor: 'primary.main',
                                width: 64,
                                height: 64,
                                boxShadow: 2,
                            }}
                        >
                            <PersonAddIcon sx={{ fontSize: 40 }} />
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
                            Créer un compte
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
                            Rejoignez notre assistant juridique intelligent
                        </Typography>

                        {error && (
                            <Fade in={true}>
                                <Alert 
                                    severity="error" 
                                    sx={{ 
                                        width: '100%', 
                                        mb: 2,
                                        '& .MuiAlert-message': {
                                            width: '100%',
                                        }
                                    }}
                                >
                                    {error}
                                </Alert>
                            </Fade>
                        )}

                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            sx={{
                                width: '100%',
                                mt: 1,
                            }}
                        >
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Nom"
                                    name="nom"
                                    value={formData.nom}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                <TextField
                                    required
                                    fullWidth
                                    label="Prénom"
                                    name="prenom"
                                    value={formData.prenom}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                            </Stack>

                            <TextField
                                required
                                fullWidth
                                label="Adresse email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isLoading}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Mot de passe"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleChange}
                                disabled={isLoading}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={() => setShowPassword(!showPassword)}
                                                size="medium"
                                            >
                                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 2 }}
                            />

                            {formData.password && (
                                <Box sx={{ mb: 2 }}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={passwordStrength}
                                        sx={{
                                            mb: 1,
                                            height: 8,
                                            borderRadius: 1,
                                            bgcolor: 'background.default',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: passwordStrength < 40 ? 'error.main' :
                                                        passwordStrength < 70 ? 'warning.main' :
                                                        'success.main'
                                            }
                                        }}
                                    />
                                    <Stack spacing={1}>
                                        {passwordRequirements.map((req, index) => (
                                            <Typography
                                                key={index}
                                                variant="caption"
                                                sx={{
                                                    color: req.regex.test(formData.password) ? 'success.main' : 'text.secondary',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                {req.regex.test(formData.password) ? '✓' : '○'} {req.text}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            <TextField
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Confirmer le mot de passe"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                disabled={isLoading}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle confirm password visibility"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                size="medium"
                                            >
                                                {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 3 }}
                            />

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
                                    position: 'relative',
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
                                    "S'inscrire"
                                )}
                            </Button>

                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => navigate('/login')}
                                disabled={isLoading}
                                sx={{
                                    height: '48px',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                }}
                            >
                                Déjà inscrit ? Se connecter
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </Fade>
    );
};

export default Signup;
