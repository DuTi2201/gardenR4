import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center', width: '100%' }}>
          <Typography variant="h1" component="h1" sx={{ mb: 2, fontSize: '6rem', fontWeight: 'bold', color: 'primary.main' }}>
            404
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom>
            Trang không tồn tại
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Rất tiếc, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm.
          </Typography>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Quay về trang chủ
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound; 