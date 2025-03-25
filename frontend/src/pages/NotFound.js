import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Paper, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useMascot } from '../components/Mascot/MascotContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { setSad, setMascotPosition, showMessage } = useMascot();

  // Kích hoạt linh vật với trạng thái buồn khi vào trang 404
  useEffect(() => {
    setSad();
    setMascotPosition('center');
    showMessage('Trang bạn tìm kiếm không tồn tại! Quay lại trang chủ nhé?', 0);

    // Cleanup khi rời trang
    return () => {
      setMascotPosition('bottom-right');
    };
  }, [setSad, setMascotPosition, showMessage]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h1"
            color="error"
            sx={{
              fontWeight: 'bold',
              fontSize: { xs: '6rem', sm: '8rem' },
              marginBottom: 2,
            }}
          >
            404
          </Typography>

          <Typography
            variant="h5"
            color="textPrimary"
            align="center"
            sx={{ mb: 3 }}
          >
            Trang không tồn tại
          </Typography>

          <Typography
            variant="body1"
            color="textSecondary"
            align="center"
            sx={{ mb: 4 }}
          >
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            size="large"
          >
            Quay lại trang chủ
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound; 