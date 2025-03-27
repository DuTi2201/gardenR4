// src/components/GardenDetail/GardenCameraTab.js
import React from 'react';
import {
  Box, Typography, Button, Grid, Paper, Chip, Alert, Card, CardMedia,
  CardContent, CardActions, CircularProgress
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon, Videocam as VideocamIcon, Stop as StopIcon,
  FullscreenRounded as FullscreenIcon, Analytics as AnalyticsIcon, CameraAlt as CameraAltIcon
} from '@mui/icons-material';
import { imageService } from '../../services'; // Adjust path
import { useToast } from '../../context/ToastContext'; // Adjust path

const GardenCameraTab = ({
  garden,
  isCameraOffline,
  lastCameraConnected,
  captureLoading,
  handleCaptureImage,
  isStreaming,
  toggleStream,
  streamImage,
  latestImage,
  analysisLoading,
  setTabValue, // To switch tabs after analysis
  getAnalysisTabIndex // Function to get the correct index
}) => {
  const { toast } = useToast();

  const handleAnalyzeImageClick = async (imageId) => {
    if (!imageId) return;
    try {
      await imageService.analyzeImage(imageId);
      toast.success('Đã gửi yêu cầu phân tích hình ảnh.');
      setTabValue(getAnalysisTabIndex()); // Switch to analysis tab
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error('Không thể phân tích ảnh: ' + error.message);
    }
  };

  return (
    <Box>
      <Paper 
        elevation={3} 
        sx={{ 
          mb: 4, 
          overflow: 'hidden', 
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-end) 100%)',
          boxShadow: 'var(--card-shadow)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: 'var(--card-shadow-hover)'
          }
        }} 
        className="garden-card"
      >
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', opacity: 0.7 }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CameraAltIcon sx={{ fontSize: 28, mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ 
                  fontWeight: 600, 
                  color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit'
                }}>
                  Camera
                </Typography>
              </Box>
            </Grid>
            <Grid item>
              {garden.has_camera && (
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" sx={{ mr: 1, fontWeight: 500 }}>
                    Mã Camera: <strong>{garden.camera_serial || 'N/A'}</strong>
                  </Typography>
                  <Chip
                    label={isCameraOffline ? "Offline" : "Online"}
                    color={isCameraOffline ? "error" : "success"}
                    size="small"
                    sx={{ 
                      fontWeight: 600,
                      borderRadius: '8px',
                      '& .MuiChip-label': {
                        px: 1.5
                      }
                    }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>

        {!garden.has_camera ? (
          <Box p={3}>
            <Alert 
              severity="info" 
              sx={{ 
                borderRadius: '12px',
                '& .MuiAlert-icon': {
                  color: 'var(--icon-color)'
                }
              }}
            >
              Vườn này không có camera.
            </Alert>
          </Box>
        ) : (
          <Box p={3}>
            {isCameraOffline ? (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 3, 
                  borderRadius: '12px',
                  animation: 'pulse 2s infinite ease-in-out',
                  '& .MuiAlert-icon': {
                    color: '#ff9800'
                  }
                }}
              >
                Camera hiện đang offline.
                {lastCameraConnected && (
                  <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 500 }}>
                    Kết nối cuối: {lastCameraConnected.toLocaleString('vi-VN')}
                  </Typography>
                )}
              </Alert>
            ) : (
               <Box mb={3}>
                 <Grid container spacing={2}>
                   <Grid item xs={12} sm={6}>
                     <Button
                       variant="contained"
                       color="primary"
                       startIcon={<PhotoCameraIcon />}
                       onClick={handleCaptureImage}
                       disabled={captureLoading || isCameraOffline}
                       fullWidth
                       sx={{ 
                         borderRadius: '12px',
                         py: 1.5,
                         fontWeight: 600,
                         boxShadow: 'var(--button-shadow)',
                         '&:hover': {
                           boxShadow: 'var(--button-shadow-hover)',
                           transform: 'translateY(-2px)'
                         },
                         textTransform: 'none',
                         fontSize: '1rem',
                         transition: 'all 0.3s ease'
                       }}
                     >
                       {captureLoading ? (
                         <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                           Đang chụp...
                         </Box>
                       ) : 'Chụp ảnh'}
                     </Button>
                   </Grid>
                   <Grid item xs={12} sm={6}>
                     <Button
                       variant={isStreaming ? "outlined" : "contained"}
                       color={isStreaming ? "error" : "success"}
                       startIcon={isStreaming ? <StopIcon /> : <VideocamIcon />}
                       onClick={toggleStream}
                       disabled={isCameraOffline}
                       fullWidth
                       sx={{ 
                         borderRadius: '12px',
                         py: 1.5,
                         fontWeight: 600,
                         boxShadow: isStreaming ? 'none' : 'var(--button-shadow)',
                         border: isStreaming ? '2px solid' : 'none',
                         borderColor: isStreaming ? 'error.main' : 'none',
                         '&:hover': {
                           boxShadow: isStreaming ? 'none' : 'var(--button-shadow-hover)',
                           transform: 'translateY(-2px)'
                         },
                         textTransform: 'none',
                         fontSize: '1rem',
                         transition: 'all 0.3s ease'
                       }}
                     >
                       {isStreaming ? 'Dừng stream' : 'Bắt đầu stream'}
                     </Button>
                   </Grid>
                 </Grid>
               </Box>
            )}

            {/* Stream Video */}
            {isStreaming && (
              <Box mb={4}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                    color: 'var(--icon-color)',
                    mr: 1.5 
                  }}>
                    <VideocamIcon fontSize="small" />
                  </Box>
                  Stream Video
                </Typography>
                <Card 
                  sx={{ 
                    borderRadius: '16px', 
                    overflow: 'hidden',
                    boxShadow: 'var(--card-shadow)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: 'var(--card-shadow-hover)',
                      transform: 'translateY(-5px)'
                    }
                  }}
                  className="sensor-card"
                >
                  {streamImage ? (
                    <img
                      src={streamImage}
                      alt="Live stream"
                      width="100%"
                      style={{ display: 'block', maxWidth: '100%' }}
                    />
                  ) : (
                    <Box sx={{ 
                      height: 300, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: 'rgba(0, 0, 0, 0.05)' 
                    }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress sx={{ mb: 2, color: 'var(--icon-color)' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Đang kết nối...</Typography>
                      </Box>
                    </Box>
                  )}
                </Card>
              </Box>
            )}

            {/* Latest Image */}
            {latestImage && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                    color: 'var(--icon-color)',
                    mr: 1.5 
                  }}>
                    <PhotoCameraIcon fontSize="small" />
                  </Box>
                  Hình ảnh mới nhất
                </Typography>
                <Card 
                  sx={{ 
                    borderRadius: '16px', 
                    overflow: 'hidden',
                    boxShadow: 'var(--card-shadow)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: 'var(--card-shadow-hover)',
                      transform: 'translateY(-5px)'
                    }
                  }}
                  className="sensor-card"
                >
                  <CardMedia
                    component="img"
                    image={latestImage.image_url}
                    alt="Garden image"
                    sx={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Chụp lúc: {new Date(latestImage.created_at).toLocaleString('vi-VN')}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                      size="medium" 
                      variant="outlined"
                      startIcon={<FullscreenIcon />}
                      onClick={() => window.open(latestImage.image_url, '_blank')}
                      sx={{ 
                        borderRadius: '10px', 
                        borderColor: 'var(--button-off-border)',
                        color: 'var(--text-secondary)',
                        textTransform: 'none',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      Xem đầy đủ
                    </Button>
                    <Button
                      size="medium"
                      variant="contained"
                      color="primary"
                      startIcon={<AnalyticsIcon />}
                      onClick={() => handleAnalyzeImageClick(latestImage._id)}
                      disabled={analysisLoading}
                      sx={{ 
                        borderRadius: '10px', 
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'var(--button-shadow)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: 'var(--button-shadow-hover)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      {analysisLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />
                          Đang phân tích...
                        </Box>
                      ) : 'Phân tích'}
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default GardenCameraTab;