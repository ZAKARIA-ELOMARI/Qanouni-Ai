import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    Alert,
    CircularProgress,
    AppBar,
    Toolbar,
    IconButton,
    Container,
    Card,
    CardContent,
    LinearProgress,
    Chip,
    TextField,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import InfoIcon from '@mui/icons-material/Info';
import { uploadFiles, askFiles, getFileSession, deleteFileSession } from '../config/api';
import ReactMarkdown from 'react-markdown';

// Function to remove source citations like 【4:0†source】
const removeSourceCitations = (text) => {
    if (!text) return text;
    // Remove citations in the format 【number:number†source】
    return text.replace(/【\d+:\d+†source】/g, '');
};

const Files = () => {
    const [session, setSession] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [question, setQuestion] = useState('');
    const [asking, setAsking] = useState(false);
    const [response, setResponse] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSession();
    }, []);

    const fetchSession = async () => {
        try {
            setLoading(true);
            const response = await getFileSession();
            if (response.data.success) {
                setSession(response.data.session);
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Error fetching session:', error);
                setError('Erreur lors de la récupération de la session.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // Validate file types (only PDFs for now)
        const invalidFiles = files.filter(file => !file.type.includes('pdf'));
        if (invalidFiles.length > 0) {
            setError('Seuls les fichiers PDF sont acceptés pour le moment.');
            return;
        }

        // Validate file sizes (max 10MB per file)
        const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            setError('Les fichiers ne doivent pas dépasser 10 MB.');
            return;
        }

        try {
            setUploading(true);
            setError('');
            setUploadProgress(0);

            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await uploadFiles(formData);
            
            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.data.success) {
                setSuccess(`${files.length} fichier(s) téléchargé(s) avec succès !`);
                await fetchSession(); // Refresh session data
            }

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            setError(error.response?.data?.message || 'Erreur lors du téléchargement des fichiers.');
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 2000);
        }
    };

    const handleAskQuestion = async (e) => {
        e.preventDefault();
        if (!question.trim()) {
            setError('Veuillez saisir une question.');
            return;
        }

        if (!session || !session.uploadedFiles || session.uploadedFiles.length === 0) {
            setError('Veuillez d\'abord télécharger des documents.');
            return;
        }

        try {
            setAsking(true);
            setError('');
            setResponse('');

            const response = await askFiles({ message: question.trim() });
            
            if (response.data.success) {
                setResponse(response.data.response);
                setQuestion('');
            }
        } catch (error) {
            console.error('Error asking question:', error);
            setError(error.response?.data?.message || 'Erreur lors de l\'envoi de la question.');
        } finally {
            setAsking(false);
        }
    };

    const handleDeleteSession = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer tous les fichiers et recommencer ?')) {
            return;
        }

        try {
            setLoading(true);
            await deleteFileSession();
            setSession(null);
            setResponse('');
            setSuccess('Session supprimée avec succès.');
        } catch (error) {
            console.error('Error deleting session:', error);
            setError('Erreur lors de la suppression de la session.');
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Non disponible';
        try {
            return new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric',
                month: 'short',
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
            >
                <Toolbar>
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
                        Gestion des Documents
                    </Typography>
                    {session && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleDeleteSession}
                            size="small"
                        >
                            Supprimer Session
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {/* Alerts */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                    {/* Upload Section */}
                    <Box sx={{ flex: 1 }}>
                        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CloudUploadIcon color="primary" />
                                Télécharger des Documents
                            </Typography>
                            
                            <Box sx={{ mb: 3 }}>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<CloudUploadIcon />}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    fullWidth
                                    size="large"
                                    sx={{ py: 2 }}
                                >
                                    {uploading ? 'Téléchargement...' : 'Choisir des fichiers PDF'}
                                </Button>
                            </Box>

                            {uploading && uploadProgress > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={uploadProgress}
                                        sx={{ mb: 1, height: 8, borderRadius: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Téléchargement: {uploadProgress}%
                                    </Typography>
                                </Box>
                            )}

                            <Alert severity="info" icon={<InfoIcon />}>
                                <Typography variant="body2">
                                    • Seuls les fichiers PDF sont acceptés<br/>
                                    • Taille maximale: 10 MB par fichier<br/>
                                    • Vous pouvez télécharger plusieurs fichiers à la fois
                                </Typography>
                            </Alert>
                        </Paper>                        {/* Current Session */}
                        {session && (
                            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Session Actuelle
                                </Typography>
                              
                                
                                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                    Documents téléchargés ({session.uploadedFiles?.length || 0})
                                </Typography>
                                {session.uploadedFiles && session.uploadedFiles.length > 0 ? (
                                    <List>
                                        {session.uploadedFiles.map((file, index) => (
                                            <ListItem key={index} sx={{ px: 0 }}>
                                                <ListItemIcon>
                                                    <DescriptionIcon color="primary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={file.name}
                                                    secondary={`${formatFileSize(file.size)} • Téléchargé le ${formatDate(file.uploadedAt)}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Aucun document téléchargé
                                    </Typography>
                                )}
                            </Paper>
                        )}
                    </Box>

                    {/* Question Section */}
                    <Box sx={{ flex: 1 }}>
                        <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: 'fit-content', minHeight: 400 }}>
                            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <QuestionAnswerIcon color="primary" />
                                Poser une Question
                            </Typography>

                            <Box component="form" onSubmit={handleAskQuestion} sx={{ mb: 3 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    variant="outlined"
                                    label="Votre question sur les documents..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    disabled={asking || !session || !session.uploadedFiles?.length}
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={asking ? <CircularProgress size={16} /> : <SendIcon />}
                                    disabled={asking || !question.trim() || !session || !session.uploadedFiles?.length}
                                    fullWidth
                                >
                                    {asking ? 'Traitement...' : 'Envoyer la Question'}
                                </Button>
                            </Box>

                            {!session || !session.uploadedFiles?.length ? (
                                <Alert severity="warning">
                                    Téléchargez d'abord des documents pour pouvoir poser des questions.
                                </Alert>
                            ) : null}

                            {response && (
                                <>
                                    <Divider sx={{ my: 3 }} />
                                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                        Réponse:
                                    </Typography>
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'background.default',
                                            borderRadius: 1,
                                            maxHeight: 400,
                                            overflow: 'auto'
                                        }}
                                    >                                        <ReactMarkdown>
                                            {removeSourceCitations(response)}
                                        </ReactMarkdown>
                                    </Paper>
                                </>
                            )}
                        </Paper>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};

export default Files;
