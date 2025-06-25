import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 3,
                textAlign: 'center'
            }}
        >
            <ErrorOutlineIcon 
                sx={{ 
                    fontSize: 80, 
                    color: 'primary.main',
                    mb: 2,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                        '0%': {
                            transform: 'scale(1)',
                            opacity: 0.7,
                        },
                        '50%': {
                            transform: 'scale(1.05)',
                            opacity: 1,
                        },
                        '100%': {
                            transform: 'scale(1)',
                            opacity: 0.7,
                        },
                    },
                }}
            />
            <Typography 
                variant="h1" 
                sx={{ 
                    fontSize: { xs: '4rem', sm: '6rem' },
                    fontWeight: 700,
                    color: 'primary.main',
                    mb: 2
                }}
            >
                404
            </Typography>
            <Typography 
                variant="h4" 
                sx={{ 
                    mb: 2,
                    color: 'text.primary',
                    fontWeight: 500
                }}
            >
                Page Non Trouvée
            </Typography>
            <Typography 
                variant="body1" 
                sx={{ 
                    mb: 4,
                    color: 'text.secondary',
                    maxWidth: 500
                }}
            >
                Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
            </Typography>
            <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/')}
                sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                    }
                }}
            >
                Retour à l'accueil
            </Button>
        </Box>
    );
};

export default NotFound; 