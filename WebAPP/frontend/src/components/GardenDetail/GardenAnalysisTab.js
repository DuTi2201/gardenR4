// src/components/GardenDetail/GardenAnalysisTab.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Divider, Grid, CircularProgress, Alert, Tabs, Tab,
  List, ListItem, ListItemIcon, ListItemText, Chip, Card, CardContent, TableContainer,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  ErrorOutline as ErrorOutlineIcon,
  BugReport as BugReportIcon,
  History as HistoryIcon,
  ArrowRight as ArrowRightIcon,
  Devices as DevicesIcon,
  PlayArrow as PlayArrowIcon,
  TipsAndUpdates as TipsAndUpdatesIcon,
  Refresh as RefreshIcon, // Keep RefreshIcon if used, otherwise remove
  PhotoCamera as PhotoCameraIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  WarningAmber as WarningAmberIcon,
  Error as MuiErrorIcon, // Rename to avoid conflict
  Info as InfoIcon,
  Spa as SpaIcon, // Use relevant icons
  ColorLens as ColorLensIcon, // Example
  TrendingUp as TrendingUpIcon, // Example
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { analysisService } from '../../services'; // Adjust path
import { useToast } from '../../context/ToastContext'; // Adjust path
import AnalysisHistoryDialog from './AnalysisHistoryDialog'; // Adjust path
import { getDayNameVi } from './utils/gardenUtils'; // Adjust path

// Gradient button style (can be moved to a theme or shared style file)
const gradientButtonStyle = {
  borderRadius: '28px',
  padding: '10px 24px',
  background: 'linear-gradient(45deg, var(--primary-color), #2196F3)',
  boxShadow: '0 4px 14px rgba(76, 175, 80, 0.25)',
  border: 'none',
  fontWeight: 600,
  textTransform: 'none',
  color: 'white', // Ensure text is visible
  '&:hover': {
    background: 'linear-gradient(45deg, var(--primary-dark), #1976d2)',
    boxShadow: '0 6px 18px rgba(76, 175, 80, 0.35)',
  },
  '&:disabled': {
    opacity: 0.7,
    background: 'linear-gradient(45deg, var(--primary-color), #2196F3)', // Keep gradient when disabled
    color: 'rgba(255, 255, 255, 0.7)' // Dim text color
  }
};

const GardenAnalysisTab = ({
  gardenId,
  analysis, // Current analysis result
  analysisLoading, // Loading state for NEW analysis
  handleAnalyzeGarden, // Function to trigger a new analysis
  applyingSuggestions, // Loading state for applying suggestions
  handleApplySuggestions // Function to apply suggestions
}) => {
  const { toast } = useToast();
  const [analysisTabValue, setAnalysisTabValue] = useState(0);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryAnalysis, setSelectedHistoryAnalysis] = useState(null);
  const [viewHistoryDialogOpen, setViewHistoryDialogOpen] = useState(false);

  const loadAnalysisHistory = useCallback(async () => {
    if (!gardenId) return;
    setLoadingHistory(true);
    try {
      const response = await analysisService.getAnalysisHistory(gardenId);
      if (response.success) {
        setAnalysisHistory(response.data || []);
      } else {
         // Only toast if there's a specific error message, not just empty history
         if (response.message) {
            toast.error(response.message);
         }
        setAnalysisHistory([]);
      }
    } catch (error) {
      console.error('Error loading analysis history:', error);
      toast.error('Lỗi tải lịch sử phân tích.');
      setAnalysisHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [gardenId, toast]);

  useEffect(() => {
    if (analysisTabValue === 1) { // Load history only when tab is active
      loadAnalysisHistory();
    }
  }, [analysisTabValue, loadAnalysisHistory]);

   // Initial load if starting on history tab (less likely)
   useEffect(() => {
       loadAnalysisHistory();
   }, [loadAnalysisHistory]);


  const handleAnalysisTabChange = (event, newValue) => {
    setAnalysisTabValue(newValue);
  };

  const handleViewHistoryAnalysis = (analysisItem) => {
    setSelectedHistoryAnalysis(analysisItem);
    setViewHistoryDialogOpen(true);
  };

  const handleCloseHistoryDialog = () => {
    setViewHistoryDialogOpen(false);
    setSelectedHistoryAnalysis(null); // Clear selection
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phân tích này?')) {
      return;
    }
    try {
      const response = await analysisService.deleteAnalysis(gardenId, analysisId);
      if (response.success) {
        toast.success('Đã xóa phân tích thành công.');
        loadAnalysisHistory(); // Refresh history list
        // Optional: If the deleted analysis was the current one, clear it
        // if (analysis?._id === analysisId) { /* call parent to clear analysis */ }
      } else {
        toast.error(response.message || 'Không thể xóa phân tích.');
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Lỗi xóa phân tích.');
    }
  };

   // Wrapper for applying suggestions from history dialog
   const applySuggestionsFromHistory = (historyItem) => {
     // Pass the specific recommendations from the history item
     handleApplySuggestions(historyItem?.result?.device_recommendations || []);
     handleCloseHistoryDialog();
   };

  // --- Rendering Helper for Analysis Details ---
  const renderAnalysisDetails = (analysisData) => {
    if (!analysisData || !analysisData.result) {
      return <Alert severity="info">Không có dữ liệu phân tích chi tiết.</Alert>;
    }
    const { result } = analysisData;

    return (
        <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ /* Timestamp Box */
                mb: 3, p: 2.5, borderRadius: 3,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(33, 150, 243, 0.2)' : '1px solid rgba(33, 150, 243, 0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="500">
                    Phân tích lúc:
                </Typography>
                <Typography variant="h6" color="primary.main" fontWeight="600">
                    {analysisData.timestamp ? new Date(analysisData.timestamp).toLocaleString('vi-VN', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'N/A'}
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Health Status Card */}
                <Grid item xs={12}>
                   <Card sx={{ 
                     mb: 3, 
                     borderRadius: 3, 
                     boxShadow: 'var(--shadow-md)', 
                     overflow: 'hidden', 
                     transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
                     '&:hover': { 
                       transform: 'translateY(-5px)', 
                       boxShadow: 'var(--shadow-lg)' 
                     } 
                   }}>
                     <CardContent sx={{ p: 3 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                         <Box sx={{ 
                           width: 48, 
                           height: 48, 
                           borderRadius: '50%', 
                           display: 'flex', 
                           alignItems: 'center', 
                           justifyContent: 'center', 
                           background: 'linear-gradient(45deg, var(--primary-color), #8BC34A)', 
                           color: 'white', 
                           mr: 2, 
                           boxShadow: '0 4px 8px rgba(76, 175, 80, 0.25)' 
                         }}>
                           <SpaIcon sx={{ fontSize: 24 }} />
                         </Box>
                         <Box>
                           <Typography variant="h6" fontWeight="600" color="var(--text-primary)">Tình trạng sức khỏe vườn</Typography>
                           <Typography variant="caption" color="var(--text-secondary)">Đánh giá tổng quan</Typography>
                         </Box>
                       </Box>
                       <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                         <Typography variant="h5" fontWeight="600" sx={{ mr: 2, color: "var(--text-primary)" }}>{result.health_status || 'N/A'}</Typography>
                         {result.overallScore !== undefined && (
                           <Chip label={`Điểm: ${result.overallScore}/100`} color={ result.overallScore >= 80 ? 'success' : result.overallScore >= 60 ? 'primary' : result.overallScore >= 40 ? 'warning' : 'error' } sx={{ fontWeight: 600, fontSize: '0.875rem', padding: '6px 2px', height: 32 }} />
                         )}
                       </Box>
                       <Divider sx={{ my: 2 }} />
                       <Typography variant="body1" paragraph sx={{ lineHeight: 1.6, color: "var(--text-primary)" }}>{result.summary || 'Không có tóm tắt.'}</Typography>
                     </CardContent>
                   </Card>
                 </Grid>

                 {/* Environment & Forecast Cards */}
                 <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      height: '100%', 
                      borderRadius: 2, 
                      boxShadow: 'var(--shadow-md)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
                      '&:hover': { 
                        transform: 'translateY(-5px)', 
                        boxShadow: 'var(--shadow-lg)' 
                      } 
                    }}>
                       <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                             <Box sx={{ 
                               width: 40, 
                               height: 40, 
                               borderRadius: '50%', 
                               display: 'flex', 
                               alignItems: 'center', 
                               justifyContent: 'center', 
                               background: 'linear-gradient(45deg, #2196F3, #03A9F4)', 
                               color: 'white', 
                               mr: 2 
                             }}>
                                <SettingsIcon sx={{ fontSize: 24 }} />
                             </Box>
                             <Typography variant="h6" fontWeight="600" color="var(--text-primary)">Môi trường</Typography>
                          </Box>
                          <Typography variant="body1" sx={{ 
                            p: 2, 
                            bgcolor: 'rgba(33, 150, 243, 0.05)', 
                            borderRadius: 1, 
                            border: '1px solid rgba(33, 150, 243, 0.1)',
                            color: "var(--text-primary)"
                          }}>{result.environment_assessment || 'N/A'}</Typography>
                       </CardContent>
                    </Card>
                 </Grid>
                  <Grid item xs={12} md={6}>
                     <Card sx={{ 
                       height: '100%', 
                       borderRadius: 2, 
                       boxShadow: 'var(--shadow-md)',
                       transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
                       '&:hover': { 
                         transform: 'translateY(-5px)', 
                         boxShadow: 'var(--shadow-lg)' 
                       } 
                     }}>
                        <CardContent sx={{ p: 3 }}>
                           <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Box sx={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                background: 'linear-gradient(45deg, #FF9800, #FFC107)', 
                                color: 'white', 
                                mr: 2 
                              }}>
                                 <TrendingUpIcon sx={{ fontSize: 24 }} />
                              </Box>
                              <Typography variant="h6" fontWeight="600" color="var(--text-primary)">Dự báo</Typography>
                           </Box>
                           <Typography variant="body1" sx={{ 
                             p: 2, 
                             bgcolor: 'rgba(255, 152, 0, 0.05)', 
                             borderRadius: 1, 
                             border: '1px solid rgba(255, 152, 0, 0.1)',
                             color: "var(--text-primary)"
                           }}>{result.forecast || 'N/A'}</Typography>
                        </CardContent>
                     </Card>
                  </Grid>

                {/* Attention Points Card */}
                <Grid item xs={12}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      boxShadow: 'var(--shadow-md)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
                      '&:hover': { 
                        transform: 'translateY(-5px)', 
                        boxShadow: 'var(--shadow-lg)' 
                      } 
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  background: 'linear-gradient(45deg, #F44336, #FF5722)', 
                                  color: 'white', 
                                  mr: 2 
                                }}>
                                    <WarningAmberIcon sx={{ fontSize: 24 }} />
                                </Box>
                                <Typography variant="h6" fontWeight="600" color="var(--text-primary)">Điểm cần chú ý</Typography>
                            </Box>
                            <Typography variant="body1" sx={{ 
                              p: 2, 
                              bgcolor: 'rgba(244, 67, 54, 0.05)', 
                              borderRadius: 1, 
                              border: '1px solid rgba(244, 67, 54, 0.1)',
                              color: "var(--text-primary)"
                            }}>{result.attention_points || 'Không có.'}</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* General Recommendations */}
                {result.recommendations?.length > 0 && (
                   <Grid item xs={12}>
                      <Card sx={{ 
                        boxShadow: 'var(--shadow-md)',
                        borderRadius: 2,
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
                        '&:hover': { 
                          transform: 'translateY(-5px)', 
                          boxShadow: 'var(--shadow-lg)' 
                        } 
                      }}>
                         <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                               <Box sx={{ 
                                 width: 40, 
                                 height: 40, 
                                 borderRadius: '50%', 
                                 display: 'flex', 
                                 alignItems: 'center', 
                                 justifyContent: 'center', 
                                 background: 'linear-gradient(45deg, #3F51B5, #9C27B0)', 
                                 color: 'white', 
                                 mr: 2 
                               }}>
                                  <TipsAndUpdatesIcon />
                               </Box>
                               <Typography variant="subtitle1" fontWeight="600" color="var(--text-primary)">Đề xuất cải thiện</Typography>
                            </Box>
                            <List sx={{ bgcolor: 'rgba(63, 81, 181, 0.05)', borderRadius: 1, border: '1px solid rgba(63, 81, 181, 0.1)', p: 2 }}>
                               {result.recommendations.map((rec, index) => (
                                  <ListItem key={index} sx={{ py: 1, borderBottom: index < result.recommendations.length - 1 ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none' }}>
                                     <ListItemIcon><ArrowRightIcon color="primary" /></ListItemIcon>
                                     <ListItemText primary={rec} />
                                  </ListItem>
                               ))}
                            </List>
                         </CardContent>
                      </Card>
                   </Grid>
                )}

                {/* Device Recommendations */}
                {result.device_recommendations?.length > 0 && (
                  <Grid item xs={12}>
                    <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ /* Icon Circle */ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #4CAF50, #009688)', color: 'white', mr: 2 }}>
                              <DevicesIcon />
                            </Box>
                            <Typography variant="subtitle1" fontWeight="600">
                              Đề xuất điều khiển thiết bị
                            </Typography>
                          </Box>
                           {/* Apply button only shown for the CURRENT analysis */}
                           {analysisData === analysis && (
                              <Button
                                variant="contained"
                                sx={gradientButtonStyle} // Apply gradient style
                                disabled={applyingSuggestions}
                                onClick={() => handleApplySuggestions(result.device_recommendations)}
                                startIcon={applyingSuggestions ? <CircularProgress size={18} color="inherit"/> : <PlayArrowIcon />}
                              >
                                {applyingSuggestions ? 'Đang áp dụng...' : 'Áp dụng đề xuất'}
                              </Button>
                           )}
                        </Box>
                         <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Lịch trình tự động đề xuất:
                         </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.1)' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                                <TableCell>Thiết bị</TableCell>
                                <TableCell>Thời gian</TableCell>
                                <TableCell>Hành động</TableCell>
                                <TableCell>Ngày</TableCell>
                                <TableCell>Chi tiết</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {result.device_recommendations.map((rec, index) => (
                                <TableRow key={index} hover>
                                  <TableCell>
                                    {rec.device === 'PUMP' && 'Máy bơm 1'}
                                    {rec.device === 'PUMP2' && 'Máy bơm 2'}
                                    {rec.device === 'PUMP_2' && 'Máy bơm 2'}
                                    {rec.device === 'FAN' && 'Quạt'}
                                    {rec.device === 'LIGHT' && 'Đèn'}
                                  </TableCell>
                                  <TableCell>{rec.time}</TableCell>
                                  <TableCell>
                                    <Chip label={rec.action ? "BẬT" : "TẮT"} color={rec.action ? "success" : "default"} size="small" />
                                  </TableCell>
                                  <TableCell>{Array.isArray(rec.days) ? rec.days.map(getDayNameVi).join(', ') : '-'}</TableCell>
                                  <TableCell>{rec.description || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Image Analysis Details */}
                {result.image_analysis && (
                  <Grid item xs={12}>
                     <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mt: 2 }}>
                       <CardContent>
                         <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ /* Icon Circle */ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #2196F3, #00BCD4)', color: 'white', mr: 2 }}>
                               <PhotoCameraIcon />
                            </Box>
                            <Typography variant="subtitle1" fontWeight="600">Phân tích hình ảnh</Typography>
                         </Box>
                         <Grid container spacing={2}>
                            {result.image_analysis.issues_detected?.length > 0 && (
                               <Grid item xs={12} md={6}>
                                  <Box sx={{ p: 2, bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: 1, border: '1px solid rgba(244, 67, 54, 0.1)', height: '100%' }}>
                                     <Typography variant="subtitle2" color="error" fontWeight="600" gutterBottom>Vấn đề:</Typography>
                                     <List dense disablePadding>
                                        {result.image_analysis.issues_detected.map((issue, idx) => (
                                           <ListItem key={idx} sx={{ py: 0.5 }}>
                                              <ListItemIcon sx={{ minWidth: 36 }}><MuiErrorIcon color="error" fontSize="small" /></ListItemIcon>
                                              <ListItemText primary={issue} />
                                           </ListItem>
                                        ))}
                                     </List>
                                  </Box>
                               </Grid>
                            )}
                            {result.image_analysis.growth_assessment && (
                               <Grid item xs={12} md={6}>
                                  <Box sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.05)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.1)', height: '100%' }}>
                                     <Typography variant="subtitle2" color="success.main" fontWeight="600" gutterBottom>Phát triển:</Typography>
                                     <Typography variant="body2">{result.image_analysis.growth_assessment}</Typography>
                                  </Box>
                               </Grid>
                            )}
                             {result.image_analysis.nutrient_deficiencies?.length > 0 && (
                               <Grid item xs={12} md={6}>
                                 <Box sx={{ p: 2, bgcolor: 'rgba(255, 193, 7, 0.05)', borderRadius: 1, border: '1px solid rgba(255, 193, 7, 0.1)', height: '100%' }}>
                                   <Typography variant="subtitle2" color="warning.main" fontWeight="600" gutterBottom>Thiếu dinh dưỡng:</Typography>
                                   <List dense disablePadding>
                                     {result.image_analysis.nutrient_deficiencies.map((def, idx) => (
                                       <ListItem key={idx} sx={{ py: 0.5 }}>
                                         <ListItemIcon sx={{ minWidth: 36 }}><WarningAmberIcon color="warning" fontSize="small" /></ListItemIcon>
                                         <ListItemText primary={def} />
                                       </ListItem>
                                     ))}
                                   </List>
                                 </Box>
                               </Grid>
                             )}
                             {result.image_analysis.pests_and_diseases?.length > 0 && (
                               <Grid item xs={12} md={6}>
                                 <Box sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.05)', borderRadius: 1, border: '1px solid rgba(156, 39, 176, 0.1)', height: '100%' }}>
                                   <Typography variant="subtitle2" color="secondary.main" fontWeight="600" gutterBottom>Sâu bệnh:</Typography>
                                   <List dense disablePadding>
                                     {result.image_analysis.pests_and_diseases.map((pest, idx) => (
                                       <ListItem key={idx} sx={{ py: 0.5 }}>
                                         <ListItemIcon sx={{ minWidth: 36 }}><BugReportIcon color="secondary" fontSize="small" /></ListItemIcon>
                                         <ListItemText primary={pest} />
                                       </ListItem>
                                     ))}
                                   </List>
                                 </Box>
                               </Grid>
                             )}
                             {result.image_analysis.color_assessment && (
                                <Grid item xs={12}>
                                   <Box sx={{ p: 2, bgcolor: 'rgba(3, 169, 244, 0.05)', borderRadius: 1, border: '1px solid rgba(3, 169, 244, 0.1)' }}>
                                      <Typography variant="subtitle2" color="info.main" fontWeight="600" gutterBottom>Màu sắc:</Typography>
                                      <Typography variant="body2">{result.image_analysis.color_assessment}</Typography>
                                   </Box>
                                </Grid>
                             )}
                         </Grid>
                       </CardContent>
                     </Card>
                  </Grid>
               )}

            </Grid>
        </Box>
    );
  };
  // --- End Rendering Helper ---


  return (
    <Paper elevation={0} sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
        {/* Background element */}
        <Box sx={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(76,175,80,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '0 0 0 100%', zIndex: 0 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BarChartIcon sx={{ fontSize: 28, mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight="600" sx={{ 
            fontSize: { xs: '1.3rem', sm: '1.5rem' },
            color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit'
          }}>
            Phân tích vườn
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<BarChartIcon />}
          onClick={handleAnalyzeGarden}
          disabled={analysisLoading}
          sx={gradientButtonStyle} // Use defined style object
        >
          {analysisLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Đang phân tích...
            </Box>
          ) : 'Phân tích mới'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={analysisTabValue}
          onChange={handleAnalysisTabChange}
          aria-label="analysis tabs"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              color: (theme) => theme.palette.mode === 'dark' ? '#fff' : undefined
            }
          }}
        >
          <Tab label="Phân tích hiện tại" />
          <Tab label="Lịch sử phân tích" />
        </Tabs>
      </Box>

      {/* Current Analysis Tab */}
      <div role="tabpanel" hidden={analysisTabValue !== 0}>
        {analysisTabValue === 0 && (
          <>
            {analysisLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 5 }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>Đang phân tích...</Typography>
              </Box>
            ) : analysis ? (
              renderAnalysisDetails(analysis) // Use the helper function
            ) : (
              <Box sx={{ /* No analysis yet box */ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 2, border: '1px dashed #bdbdbd' }}>
                 <BarChartIcon sx={{ fontSize: 60, color: 'action.disabled', mb: 2 }} />
                 <Typography variant="h6" color="text.secondary" gutterBottom>Chưa có phân tích</Typography>
                 <Typography variant="body1" color="text.secondary" textAlign="center" paragraph>Nhấn "Phân tích mới" để bắt đầu.</Typography>
                 <Button variant="outlined" color="primary" onClick={handleAnalyzeGarden} startIcon={<BarChartIcon />} sx={{ mt: 2, borderRadius: '20px', px: 3 }}>
                    Bắt đầu phân tích
                 </Button>
              </Box>
            )}
          </>
        )}
      </div>

      {/* History Analysis Tab */}
      <div role="tabpanel" hidden={analysisTabValue !== 1}>
        {analysisTabValue === 1 && (
          <>
            {loadingHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : analysisHistory.length > 0 ? (
              <>
                <Typography variant="h6" gutterBottom fontWeight="medium" sx={{ mb: 3, color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}>
                  Lịch sử phân tích ({analysisHistory.length})
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#242f3e' : 'inherit' }}>Thời gian</TableCell>
                        <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#242f3e' : 'inherit' }}>Đánh giá</TableCell>
                        <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#242f3e' : 'inherit' }}>Điểm</TableCell>
                        <TableCell align="right" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#242f3e' : 'inherit' }}>Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysisHistory.map((item) => (
                        <TableRow key={item._id} hover>
                          <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}>
                            {new Date(item.timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                            <Typography variant="caption" display="block" color={theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'}>
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: vi })}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}>{item.result?.health_status || 'N/A'}</TableCell>
                          <TableCell>
                            {item.result?.overallScore !== undefined ? (
                              <Chip
                                label={`${item.result.overallScore}/100`}
                                color={ item.result.overallScore >= 80 ? 'success' : item.result.overallScore >= 60 ? 'primary' : item.result.overallScore >= 40 ? 'warning' : 'error' }
                                size="small"
                              />
                            ) : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleViewHistoryAnalysis(item)} title="Xem chi tiết" sx={{ mr: 1 }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteAnalysis(item._id)} title="Xóa">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <HistoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>Chưa có lịch sử</Typography>
              </Box>
            )}
          </>
        )}
      </div>

       {/* History Dialog */}
        <AnalysisHistoryDialog
           open={viewHistoryDialogOpen}
           onClose={handleCloseHistoryDialog}
           analysisItem={selectedHistoryAnalysis}
           onApplySuggestions={applySuggestionsFromHistory} // Pass the wrapper
        />
    </Paper>
  );
};

export default GardenAnalysisTab;