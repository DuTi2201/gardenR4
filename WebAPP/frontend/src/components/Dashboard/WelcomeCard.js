import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Paper, Typography, Box, Button, Select, MenuItem, FormControl, InputLabel,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  InfoOutlined,
  ArrowForwardIos as ArrowForwardIosIcon,
  Refresh as RefreshIcon,
  Favorite as FavoriteIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import ConnectionStatus from '../ConnectionStatus'; // Adjust path if needed

const WelcomeCard = ({
  selectedGarden,
  gardens,
  loading,
  handleGardenChange,
  handleRefresh,
  sensorData,
  analysisData,
  loadingAnalysis,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDarkMode = theme.palette.mode === 'dark';

  const welcomeMessage = "Mừng bạn trở lại với";

  const getWelcomeSubmessage = () => {
    if (!selectedGarden) return "Hãy chọn một vườn để bắt đầu";
    if (!selectedGarden.is_connected) return "Vườn của bạn đang ngoại tuyến";
    if (sensorData && sensorData.timestamp) {
        try {
            return `Cập nhật gần nhất: ${formatDistanceToNow(new Date(sensorData.timestamp), { addSuffix: true, locale: vi })}`;
        } catch (e) {
            console.error("Error formatting date:", e);
            return "Đã cập nhật gần đây"; // Fallback message
        }
    }
    return "Đang tải dữ liệu...";
  };

  const getAnalysisSummary = () => {
    if (!analysisData) return "Chưa có dữ liệu phân tích cho vườn này.";

    console.log("WelcomeCard: Đang tạo tóm tắt từ dữ liệu:", analysisData);
    let summary = [];

    // Prioritize 'assessment' if available (likely from history)
    if (analysisData.assessment) {
        summary.push(analysisData.assessment);
    }
    // Then check 'result.health_status' or 'result.summary'
    else if (analysisData.result) {
        if (analysisData.result.health_status) {
            summary.push(analysisData.result.health_status);
        } else if (analysisData.result.summary) {
            summary.push(analysisData.result.summary);
        }
    }
    // Fallback to older format or generate generic summary
    else if (analysisData.color_assessment?.overall_health || analysisData.detected_pests || analysisData.recommendations) {
        if (analysisData.color_assessment?.overall_health) {
            summary.push(`Sức khỏe tổng thể: ${analysisData.color_assessment.overall_health}`);
        }
        if (analysisData.detected_pests?.length > 0) {
            summary.push(`Phát hiện ${analysisData.detected_pests.length} loại sâu bệnh`);
        } else if (analysisData.detected_pests) { // Check if property exists even if empty
             summary.push("Không phát hiện sâu bệnh");
        }
        if (analysisData.recommendations?.length > 0) {
            summary.push(`Có ${analysisData.recommendations.length} khuyến nghị`);
        }
    }

    // If still empty after checks, provide a generic message indicating data exists
    if (summary.length === 0 && analysisData) {
         return "Có dữ liệu phân tích nhưng không thể trích xuất tóm tắt.";
    }

    return summary.length > 0 ? summary.join(' | ') : "Chưa có dữ liệu phân tích cho vườn này.";
  };


  const getHealthScore = () => {
    if (!analysisData) return 0;
    if (analysisData.result && typeof analysisData.result.overallScore === 'number') return analysisData.result.overallScore;
    if (typeof analysisData.score === 'number') return analysisData.score;
    if (typeof analysisData.health_score === 'number') return analysisData.health_score;

    let estimatedScore = 70; // Default
    const assessmentText = analysisData.assessment ||
                         (analysisData.result && analysisData.result.health_status) ||
                         (analysisData.result && analysisData.result.summary) ||
                         (analysisData.color_assessment && analysisData.color_assessment.overall_health) ||
                         '';

    const lowerText = assessmentText.toLowerCase();
    if (lowerText.includes('tốt') || lowerText.includes('khỏe') || lowerText.includes('hoàn hảo')) estimatedScore = 85;
    else if (lowerText.includes('trung bình')) estimatedScore = 65;
    else if (lowerText.includes('kém') || lowerText.includes('yếu') || lowerText.includes('bệnh') || lowerText.includes('sâu')) estimatedScore = 40;

    return estimatedScore;
  };

  const getHealthColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green - good
    if (score >= 60) return '#8BC34A'; // Light Green - fair
    if (score >= 40) return '#FFC107'; // Yellow - average
    if (score >= 20) return '#FF9800'; // Orange - poor
    return '#F44336'; // Red - very poor
  };

  const getMascotVideoUrl = () => {
    return selectedGarden?.is_connected ? "/assets/linh_vat_vui.webm" : "/assets/linh-vat-buon.webm";
  };

  const healthScore = getHealthScore();
  const healthColor = getHealthColor(healthScore);

  return (
      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          borderRadius: '22px',
          mb: { xs: 3, sm: 4 },
          background: `linear-gradient(135deg, rgba(12, 63, 32, 0.9) 0%, rgba(26, 94, 48, 0.95) 50%, rgba(36, 110, 60, 0.9) 100%)`,
          boxShadow: '0 20px 40px rgba(12, 63, 32, 0.4)',
          color: '#fff',
          position: 'relative',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 25px 50px rgba(12, 63, 32, 0.5)',
          }
        }}
      >
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(105, 240, 174, 0.25) 0%, rgba(105, 240, 174, 0) 70%)',
            filter: 'blur(30px)',
            zIndex: 0,
            animation: 'pulse 6s infinite alternate ease-in-out',
            '@keyframes pulse': {
              '0%': { opacity: 0.6, transform: 'scale(0.95)' },
              '100%': { opacity: 1, transform: 'scale(1.05)' },
            }
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-15%',
            left: '10%',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(105, 240, 174, 0.15) 0%, rgba(105, 240, 174, 0) 70%)',
            filter: 'blur(25px)',
            zIndex: 0,
            animation: 'pulse 8s infinite alternate-reverse ease-in-out',
          }}
        />
        {/* Subtle pattern overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zm20.97 0l9.315 9.314-1.414 1.414L34.828 0h2.83zM22.344 0L13.03 9.314l1.414 1.414L25.172 0h-2.83zM32 0l12.142 12.142-1.414 1.414L30 .828 17.272 13.556l-1.414-1.414L28 0h4zM.284 0l28 28-1.414 1.414L0 2.544v2.83L25.456 28l-1.414 1.414-28-28L.284 0z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        <Grid container spacing={0} sx={{ flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Main content */}
          <Grid item xs={12} md={8} sx={{ order: { xs: 2, md: 1 } }}>
            <Box
              sx={{
                p: { xs: 3, sm: 4 }, color: 'white', height: '100%',
                display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1
              }}
            >
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom
                  sx={{
                    fontWeight: 700, mb: 0.5, fontSize: { xs: '1.6rem', sm: '2.1rem', md: '2.4rem' },
                    textShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    background: 'linear-gradient(90deg, #ffffff 0%, #dcffea 100%)',
                    backgroundClip: 'text', textFillColor: 'transparent',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.5px'
                  }}
                >
                  {welcomeMessage}{selectedGarden?.name ? ` ${selectedGarden.name}` : ''}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    opacity: 0.9, display: { xs: 'none', sm: 'block' },
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)', 
                    fontWeight: 400, 
                    letterSpacing: '0.3px',
                    fontSize: '1rem',
                    pl: 0.25
                  }}
                >
                  {getWelcomeSubmessage()}
                </Typography>
              </Box>

              {/* Health Score Bar */}
              {analysisData && !loadingAnalysis && (
                <Box
                  sx={{
                    mb: 2.5, 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '16px', 
                    p: 2.5,
                    backdropFilter: 'blur(10px)', 
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ 
                      fontWeight: 600, 
                      opacity: 0.95, 
                      display: 'flex', 
                      alignItems: 'center',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      fontSize: '1.05rem',
                      letterSpacing: '0.4px'
                    }}>
                      <FavoriteIcon sx={{ fontSize: '1rem', mr: 0.8, color: healthColor }} />
                      Chỉ số sức khỏe vườn
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      color: healthColor, 
                      fontWeight: 700, 
                      background: 'rgba(255, 255, 255, 0.15)', 
                      px: 1.5, 
                      py: 0.5, 
                      borderRadius: '12px', 
                      display: 'inline-block',
                      fontSize: '0.95rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}>
                      {healthScore}%
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    height: 12, 
                    bgcolor: 'rgba(255, 255, 255, 0.15)', 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    position: 'relative', 
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                    mt: 1
                  }}>
                    <Box sx={{ 
                      height: '100%', 
                      width: `${healthScore}%`, 
                      background: `linear-gradient(90deg, ${getHealthColor(healthScore, 0.8)} 0%, ${healthColor} 100%)`, 
                      borderRadius: '10px', 
                      transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)', 
                      boxShadow: '0 0 15px rgba(255,255,255,0.4)', 
                      position: 'relative',
                      '&::after': { 
                        content: '""', 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)', 
                        animation: 'shimmer 2.5s infinite', 
                        transform: 'translateX(-100%)', 
                        width: `${healthScore}%` 
                      }, 
                      '@keyframes shimmer': { 
                        '100%': { transform: 'translateX(100%)' } 
                      } 
                    }} />
                  </Box>
                </Box>
              )}

              {/* Analysis Data */}
              {analysisData && !loadingAnalysis && (
                <Box sx={{ 
                  display: 'flex', 
                  mt: 1, 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', 
                  p: 2.5,
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 70%)',
                    opacity: 0.5,
                    zIndex: 0,
                  }
                }}>
                  <Box 
                    component="img" 
                    src={analysisData.thumbnailUrl || process.env.PUBLIC_URL + '/assets/plant_analysis.png'} 
                    alt="Plant Analysis" 
                    sx={{ 
                      width: { xs: 80, sm: 110 }, 
                      height: { xs: 80, sm: 110 }, 
                      objectFit: 'cover', 
                      borderRadius: '12px', 
                      mr: 2.5, 
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)', 
                      border: '3px solid rgba(255, 255, 255, 0.25)',
                      zIndex: 1,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 12px 25px rgba(0, 0, 0, 0.3)',
                      }
                    }} 
                  />
                  <Box sx={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 600, 
                        mb: 0.8,
                        fontSize: '1.1rem',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.8,
                        textShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}
                    >
                      <BarChartIcon sx={{ fontSize: '1.2rem', color: '#9bffc3' }} />
                      {analysisData.plantName || 'Phân tích vườn'}
                    </Typography>
                    {analysisData.timestamp && (
                        <Typography 
                          variant="caption" 
                          display="block" 
                          sx={{ 
                            mb: 1, 
                            display: { xs: 'block', sm: 'none' }, 
                            opacity: 0.8,
                            fontSize: '0.8rem',
                            letterSpacing: '0.3px' 
                          }}
                        >
                          {formatDistanceToNow(new Date(analysisData.timestamp), { addSuffix: true, locale: vi })}
                        </Typography>
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.95, 
                        lineHeight: 1.5,
                        fontSize: '0.95rem',
                        letterSpacing: '0.3px',
                        // Limit text to 2 lines with ellipsis
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                      }}
                    >
                      {getAnalysisSummary()}
                    </Typography>
                    <Button
                      variant="text" 
                      size="small" 
                      onClick={() => navigate(`/gardens/${selectedGarden._id}?tab=analysis`)}
                      sx={{ 
                        color: 'white', 
                        mt: 1.5, 
                        textTransform: 'none', 
                        fontWeight: 600, 
                        fontSize: '0.85rem', 
                        opacity: 0.95, 
                        background: 'rgba(255, 255, 255, 0.15)', 
                        borderRadius: '10px', 
                        px: 1.8, 
                        py: 0.7,
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          opacity: 1, 
                          background: 'rgba(255, 255, 255, 0.25)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 15px rgba(0, 0, 0, 0.15)',
                        } 
                      }}
                      endIcon={<ArrowForwardIosIcon sx={{ fontSize: '0.7rem' }} />}
                    >
                      Xem chi tiết
                    </Button>
                  </Box>
                </Box>
              )}

              {/* No Analysis Data */}
              {!analysisData && !loadingAnalysis && (
                <Box sx={{ 
                  mt: 'auto', 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', 
                  p: 2.5,
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                  }
                }}>
                  <InfoOutlined sx={{ mr: 1.8, color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.2rem' }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      opacity: 0.95,
                      fontSize: '0.95rem',
                      letterSpacing: '0.3px',
                      lineHeight: 1.5,
                      textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                    }}
                  >
                    Không tìm thấy dữ liệu phân tích. Hãy chụp ảnh vườn để bắt đầu phân tích.
                  </Typography>
                </Box>
              )}

              {/* Loading Analysis */}
              {loadingAnalysis && (
                <Box sx={{ 
                  mt: 'auto', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  bgcolor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', 
                  p: 2.5,
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                }}>
                  <CircularProgress size={26} sx={{ color: 'white', mr: 2 }} />
                  <Typography 
                    variant="body2"
                    sx={{
                      fontSize: '0.95rem',
                      letterSpacing: '0.3px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                    }}
                  >
                    Đang tải dữ liệu phân tích...
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Right section - Mascot & Controls */}
          <Grid item xs={12} md={4} sx={{ order: { xs: 1, md: 2 } }}>
            <Box sx={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              height: { xs: 'auto', md: '100%' },
              p: { xs: 2, sm: 2.5, md: 3.5 },
              pb: { xs: 1.5, md: 3.5 }, 
              display: 'flex', 
              flexDirection: { xs: 'row', md: 'column' },
              alignItems: 'center', 
              justifyContent: { xs: 'space-between', md: 'space-between' },
              position: 'relative', 
              zIndex: 1, 
              borderRadius: { xs: '22px 22px 0 0', md: '0 22px 22px 0' },
              backdropFilter: 'blur(8px)',
              borderLeft: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.1)' },
              borderBottom: { xs: '1px solid rgba(255, 255, 255, 0.1)', md: 'none' }
            }}>
              {/* Mascot */}
              <Box sx={{ 
                width: { xs: '35%', sm: '30%', md: '100%' }, 
                flexShrink: 0,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                mb: { xs: 0, md: 2.5 }, 
                mr: { xs: 1.5, md: 0 },
                position: 'relative',
                pt: { xs: 0, md: 1.5 }
              }}>
                {selectedGarden ? (
                  <Box 
                    component="video" 
                    autoPlay 
                    loop 
                    muted 
                    src={getMascotVideoUrl()} 
                    sx={{ 
                      width: { xs: 90, sm: 110, md: 170, lg: 200 }, 
                      height: { xs: 90, sm: 110, md: 170, lg: 200 }, 
                      objectFit: 'contain', 
                      filter: 'drop-shadow(0 10px 35px rgba(0,0,0,0.25))', 
                      zIndex: 2,
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0px)',
                      animation: 'float 3s ease-in-out infinite',
                      '@keyframes float': {
                        '0%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-10px)' },
                        '100%': { transform: 'translateY(0px)' }
                      }
                    }} 
                  />
                ) : (
                  <Box 
                    component="img" 
                    src="/assets/linh_vat_2.png" 
                    sx={{ 
                      width: { xs: 80, sm: 100, md: 140, lg: 160 }, 
                      height: { xs: 80, sm: 100, md: 140, lg: 160 }, 
                      objectFit: 'contain', 
                      filter: 'drop-shadow(0 10px 35px rgba(0,0,0,0.25))', 
                      zIndex: 2,
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0px)',
                      animation: 'float 3s ease-in-out infinite'
                    }} 
                  />
                )}
                {/* Glow effect */}
                <Box sx={{ 
                  position: 'absolute', 
                  width: '200%', 
                  height: '200%', 
                  bottom: '-40%', 
                  left: '-50%', 
                  borderRadius: '50%', 
                  background: selectedGarden?.is_connected 
                    ? 'radial-gradient(ellipse at center, rgba(255, 217, 0, 0.35) 0%, rgba(255, 217, 0, 0) 70%)' 
                    : 'radial-gradient(ellipse at center, rgba(255, 59, 48, 0.3) 0%, rgba(255, 59, 48, 0) 70%)', 
                  filter: 'blur(35px)', 
                  zIndex: 1, 
                  opacity: 0.95, 
                  animation: 'pulse 4s infinite ease-in-out', 
                  '@keyframes pulse': { 
                    '0%': { opacity: 0.7, transform: 'scale(0.95)' }, 
                    '50%': { opacity: 1, transform: 'scale(1.05)' }, 
                    '100%': { opacity: 0.7, transform: 'scale(0.95)' } 
                  } 
                }} />
              </Box>

              {/* Controls */}
              <Box sx={{ 
                width: { xs: '65%', sm: '70%', md: '100%' }, 
                position: 'relative', 
                zIndex: 5 
              }}>
                <FormControl 
                  fullWidth 
                  variant="outlined" 
                  sx={{ 
                    mb: { xs: 1.5, md: 2.5 } 
                  }}
                >
                  <InputLabel 
                    id="garden-select-label" 
                    sx={{ 
                      color: 'white', 
                      '&.Mui-focused': { color: 'white' },
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      fontWeight: 500,
                      letterSpacing: '0.3px'
                    }}
                  >
                    Chọn vườn
                  </InputLabel>
                  <Select
                    labelId="garden-select-label" 
                    id="garden-select"
                    value={selectedGarden?._id || ''}
                    onChange={handleGardenChange}
                    label="Chọn vườn"
                    sx={{
                      color: 'white', 
                      '.MuiOutlinedInput-notchedOutline': { 
                        borderColor: 'rgba(255, 255, 255, 0.3)', 
                        borderRadius: '12px',
                        borderWidth: '1px'
                      }, 
                      '&:hover .MuiOutlinedInput-notchedOutline': { 
                        borderColor: 'rgba(255, 255, 255, 0.8)', 
                      }, 
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                        borderColor: 'white',
                        borderWidth: '1px'
                      }, 
                      '.MuiSvgIcon-root': { 
                        color: 'white', 
                      }, 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      backdropFilter: 'blur(8px)',
                      fontWeight: 500,
                      '.MuiSelect-select': {
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '0.85rem', sm: '0.95rem' }
                      }
                    }}
                    MenuProps={{ 
                      PaperProps: { 
                        sx: { 
                          bgcolor: isDarkMode ? 'rgba(42, 45, 52, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                          backgroundImage: 'none', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                          backdropFilter: 'blur(10px)',
                          '.MuiMenuItem-root': {
                            fontSize: { xs: '0.85rem', sm: '0.95rem' },
                            py: 1.2
                          }
                        } 
                      } 
                    }}
                  >
                    {gardens.map((garden) => garden && (
                      <MenuItem key={garden._id || 'unknown'} value={garden._id || 'unknown'}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                          <span>{garden.name || 'Chưa có tên'}</span>
                          <ConnectionStatus isConnected={garden.is_connected} lastConnected={garden.last_connected} size="small" variant="dot" showText={false} />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained" 
                  onClick={handleRefresh} 
                  fullWidth 
                  disabled={loading}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.15)', 
                    color: 'white', 
                    border: '1px solid rgba(255, 255, 255, 0.3)', 
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.25)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                    }, 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    py: { xs: 1, sm: 1.5 }, 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)', 
                    transition: 'all 0.3s ease', 
                    backdropFilter: 'blur(8px)',
                    fontSize: { xs: '0.85rem', sm: '0.95rem' },
                    letterSpacing: '0.3px'
                  }}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                >
                  {loading ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
  );
};

export default WelcomeCard;