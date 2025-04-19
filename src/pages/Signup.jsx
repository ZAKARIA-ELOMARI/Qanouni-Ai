import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Box, Typography, Paper } from '@mui/material';
import api from '../config/api';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/register', { username, email, password });
            if (response.data.success) {
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Une erreur est survenue');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 3,
            }}
        >
            <Container maxWidth="sm">
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 4,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                    }}
                >
                    <Typography 
                        component="h1" 
                        variant="h4" 
                        align="center" 
                        gutterBottom
                        sx={{ 
                            color: 'primary.main',
                            fontWeight: 'bold',
                            mb: 4,
                        }}
                    >
                        ChatBot Juridique Marocain
                    </Typography>
                    {error && (
                        <Typography 
                            color="error" 
                            align="center" 
                            gutterBottom
                            sx={{ mb: 2 }}
                        >
                            {error}
                        </Typography>
                    )}
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Nom d'utilisateur"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Mot de passe"
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{ mb: 3 }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ 
                                mb: 2,
                                height: '48px',
                            }}
                        >
                            S'inscrire
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate('/login')}
                            sx={{
                                height: '48px',
                                borderColor: 'primary.main',
                                color: 'primary.main',
                            }}
                        >
                            Déjà un compte ? Se connecter
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Signup; 