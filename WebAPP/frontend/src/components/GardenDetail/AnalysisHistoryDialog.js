// src/components/GardenDetail/AnalysisHistoryDialog.js
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Typography, Box,
  Grid, List, ListItem, ListItemIcon, ListItemText, Chip, Divider, CircularProgress,
  Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Card, CardContent
} from '@mui/material';
import {
  Close as CloseIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  ErrorOutline as ErrorOutlineIcon,
  BugReport as BugReportIcon,
  ArrowRight as ArrowRightIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayArrowIcon,
  TipsAndUpdates as TipsAndUpdatesIcon,
  Devices as DevicesIcon,
  PhotoCamera as PhotoCameraIcon,
  WarningAmber as WarningAmberIcon,
  Error as ErrorIcon, // Renamed to avoid conflict
  Info as InfoIcon,
  Spa as SpaIcon, // Example, adjust icon based on context
  Warning as WarningIcon
} from '@mui/icons-material';
import { getDayNameVi } from './utils/gardenUtils'; // Adjust path

const AnalysisHistoryDialog = ({ open, onClose, analysisItem, onApplySuggestions }) => {

  if (!analysisItem) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Loading...</DialogTitle>
        <DialogContent><CircularProgress /></DialogContent>
      </Dialog>
    );
  }

  const { timestamp, result } = analysisItem;
  const hasDeviceRecommendations = result?.device_recommendations && result.device_recommendations.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to right, var(--background-color), var(--paper-color))'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BarChartIcon sx={{ mr: 1, color: 'var(--primary-color)' }} />
          <Typography variant="h6" color="var(--text-primary)">Chi tiết phân tích</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <>
          <Box sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: 'rgba(33, 150, 243, 0.05)',
            border: '1px solid rgba(33, 150, 243, 0.1)'
          }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="500" color="var(--text-primary)">
              Phân tích được thực hiện vào:
            </Typography>
            <Typography variant="h6" color="var(--primary-color)">
              {new Date(timestamp).toLocaleString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ 
                mb: 3,
                borderRadius: 'var(--border-radius-lg)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
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
                      background: 'linear-gradient(45deg, var(--primary-color), #8BC34A)',
                      color: 'white',
                      mr: 2,
                      boxShadow: '0 4px 8px rgba(76, 175, 80, 0.25)'
                    }}>
                      <SpaIcon /> {/* Changed icon */}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="600" color="var(--text-primary)">
                        Tình trạng sức khỏe vườn
                      </Typography>
                      <Typography variant="caption" color="var(--text-secondary)">
                        Đánh giá tổng quan
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" fontWeight="600" sx={{ mr: 2, color: 'var(--text-primary)' }}>
                      {result?.health_status || 'Không có thông tin'}
                    </Typography>

                    {result?.overallScore !== undefined && (
                      <Chip
                        label={`Điểm đánh giá: ${result.overallScore}/100`}
                        color={
                          result.overallScore >= 80 ? 'success' :
                          result.overallScore >= 60 ? 'primary' :
                          result.overallScore >= 40 ? 'warning' : 'error'
                        }
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body1" paragraph color="var(--text-primary)">
                    {result?.summary || 'Không có thông tin tóm tắt'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
               <Card sx={{ 
                 mb: 2, 
                 height: '100%', 
                 boxShadow: 'var(--shadow-md)',
                 borderRadius: 'var(--border-radius-md)',
                 transition: 'all 0.3s ease',
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
                       background: 'linear-gradient(45deg, #2196F3, #03A9F4)', 
                       color: 'white', 
                       mr: 2,
                       boxShadow: '0 4px 8px rgba(33, 150, 243, 0.25)'
                     }}>
                       <SettingsIcon />
                     </Box>
                     <Typography variant="subtitle1" fontWeight="600" color="var(--text-primary)">
                       Đánh giá môi trường
                     </Typography>
                   </Box>
                   <Typography variant="body1" sx={{ 
                     p: 2, 
                     bgcolor: 'rgba(33, 150, 243, 0.05)', 
                     borderRadius: 1, 
                     border: '1px solid rgba(33, 150, 243, 0.1)',
                     color: 'var(--text-primary)'
                   }}>
                     {result?.environment_assessment || 'Chưa có đánh giá'}
                   </Typography>
                 </CardContent>
               </Card>
             </Grid>

            <Grid item xs={12} md={6}>
               <Card sx={{ 
                 mb: 2, 
                 height: '100%', 
                 boxShadow: 'var(--shadow-md)',
                 borderRadius: 'var(--border-radius-md)',
                 transition: 'all 0.3s ease',
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
                       background: 'linear-gradient(45deg, #FF9800, #FFC107)', 
                       color: 'white', 
                       mr: 2,
                       boxShadow: '0 4px 8px rgba(255, 152, 0, 0.25)'
                     }}>
                       <BarChartIcon />
                     </Box>
                     <Typography variant="subtitle1" fontWeight="600" color="var(--text-primary)">
                       Dự báo
                     </Typography>
                   </Box>
                   <Typography variant="body1" sx={{ 
                     p: 2, 
                     bgcolor: 'rgba(255, 152, 0, 0.05)', 
                     borderRadius: 1, 
                     border: '1px solid rgba(255, 152, 0, 0.1)',
                     color: 'var(--text-primary)'
                   }}>
                     {result?.forecast || 'Chưa có dự báo'}
                   </Typography>
                 </CardContent>
               </Card>
             </Grid>

            <Grid item xs={12}>
              <Card sx={{ 
                boxShadow: 'var(--shadow-md)',
                borderRadius: 'var(--border-radius-md)',
                transition: 'all 0.3s ease',
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
                       background: 'linear-gradient(45deg, #F44336, #FF5722)', 
                       color: 'white', 
                       mr: 2,
                       boxShadow: '0 4px 8px rgba(244, 67, 54, 0.25)'
                     }}>
                       <WarningIcon /> {/* Changed icon */}
                     </Box>
                     <Typography variant="subtitle1" fontWeight="600" color="var(--text-primary)">
                       Điểm cần chú ý
                     </Typography>
                   </Box>
                   <Typography variant="body1" sx={{ 
                     p: 2, 
                     bgcolor: 'rgba(244, 67, 54, 0.05)', 
                     borderRadius: 1, 
                     border: '1px solid rgba(244, 67, 54, 0.1)',
                     color: 'var(--text-primary)'
                   }}>
                     {result?.attention_points || 'Không có điểm cần chú ý'}
                   </Typography>
                 </CardContent>
               </Card>
            </Grid>

            {/* Recommendations */}
            {result?.recommendations && result.recommendations.length > 0 && (
              <Grid item xs={12}>
                <Card sx={{ 
                  boxShadow: 'var(--shadow-md)',
                  borderRadius: 'var(--border-radius-md)',
                  transition: 'all 0.3s ease',
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
                        mr: 2,
                        boxShadow: '0 4px 8px rgba(63, 81, 181, 0.25)'
                      }}>
                        <TipsAndUpdatesIcon />
                      </Box>
                      <Typography variant="subtitle1" fontWeight="600" color="var(--text-primary)">
                        Đề xuất cải thiện
                      </Typography>
                    </Box>
                    <List sx={{ 
                      bgcolor: 'rgba(63, 81, 181, 0.05)', 
                      borderRadius: 1, 
                      border: '1px solid rgba(63, 81, 181, 0.1)', 
                      p: 2 
                    }}>
                      {result.recommendations.map((rec, index) => (
                        <ListItem key={index} sx={{ 
                          py: 1, 
                          borderBottom: index < result.recommendations.length - 1 ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none',
                          color: 'var(--text-primary)'
                        }}>
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
            {hasDeviceRecommendations && (
              <Grid item xs={12}>
                <Card sx={{ 
                  boxShadow: 'var(--shadow-md)',
                  borderRadius: 'var(--border-radius-md)',
                  transition: 'all 0.3s ease',
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
                        background: 'linear-gradient(45deg, var(--primary-color), #009688)', 
                        color: 'white', 
                        mr: 2,
                        boxShadow: '0 4px 8px rgba(76, 175, 80, 0.25)'
                      }}>
                        <DevicesIcon />
                      </Box>
                      <Typography variant="subtitle1" fontWeight="600" color="var(--text-primary)">
                        Đề xuất điều khiển thiết bị
                      </Typography>
                    </Box>
                    <TableContainer component={Paper} variant="outlined" sx={{ 
                      bgcolor: 'rgba(76, 175, 80, 0.05)', 
                      border: '1px solid rgba(76, 175, 80, 0.1)',
                      borderRadius: 'var(--border-radius-sm)'
                    }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ 
                            bgcolor: 'rgba(76, 175, 80, 0.1)'
                          }}>
                             <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>Thiết bị</TableCell>
                             <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>Thời gian</TableCell>
                             <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>Hành động</TableCell>
                             <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>Ngày trong tuần</TableCell>
                             <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>Chi tiết</TableCell>
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
                              <TableCell>
                                {Array.isArray(rec.days) && rec.days.map(day => getDayNameVi(day)).join(', ')}
                              </TableCell>
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

            {/* Image Analysis */}
            {result?.image_analysis && (
              <Grid item xs={12}>
                <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mt: 2 }}>
                   <CardContent>
                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                       <Box sx={{ /* Icon styling */ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #2196F3, #00BCD4)', color: 'white', mr: 2 }}>
                         <PhotoCameraIcon />
                       </Box>
                       <Typography variant="subtitle1" fontWeight="600">
                         Phân tích hình ảnh
                       </Typography>
                     </Box>
                     <Grid container spacing={2}>
                       {/* Issues Detected */}
                       {result.image_analysis.issues_detected?.length > 0 && (
                         <Grid item xs={12} md={6}>
                           <Typography variant="subtitle2" gutterBottom fontWeight="500">Vấn đề:</Typography>
                           <Box sx={{ bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: 1, border: '1px solid rgba(244, 67, 54, 0.1)', p: 1.5 }}>
                             <List dense disablePadding>
                               {result.image_analysis.issues_detected.map((issue, i) => (
                                 <ListItem key={i} sx={{ py: 0.5 }}>
                                   <ListItemIcon sx={{ minWidth: 36 }}><ErrorIcon color="error" fontSize="small" /></ListItemIcon>
                                   <ListItemText primary={issue} />
                                 </ListItem>
                               ))}
                             </List>
                           </Box>
                         </Grid>
                       )}
                       {/* Growth Assessment */}
                       {result.image_analysis.growth_assessment && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="500">Phát triển:</Typography>
                            <Typography variant="body2" sx={{ p: 1.5, bgcolor: 'rgba(76, 175, 80, 0.05)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.1)' }}>
                              {result.image_analysis.growth_assessment}
                            </Typography>
                          </Grid>
                       )}
                        {/* Nutrient Deficiencies */}
                       {result.image_analysis.nutrient_deficiencies?.length > 0 && (
                         <Grid item xs={12} md={6}>
                           <Typography variant="subtitle2" gutterBottom fontWeight="500">Thiếu dinh dưỡng:</Typography>
                           <Box sx={{ bgcolor: 'rgba(255, 152, 0, 0.05)', borderRadius: 1, border: '1px solid rgba(255, 152, 0, 0.1)', p: 1.5 }}>
                             <List dense disablePadding>
                               {result.image_analysis.nutrient_deficiencies.map((def, i) => (
                                 <ListItem key={i} sx={{ py: 0.5 }}>
                                   <ListItemIcon sx={{ minWidth: 36 }}><WarningAmberIcon color="warning" fontSize="small" /></ListItemIcon>
                                   <ListItemText primary={def} />
                                 </ListItem>
                               ))}
                             </List>
                           </Box>
                         </Grid>
                       )}
                        {/* Pests & Diseases */}
                       {result.image_analysis.pests_and_diseases?.length > 0 && ( // Corrected property name based on Analysis Tab render
                         <Grid item xs={12} md={6}>
                           <Typography variant="subtitle2" gutterBottom fontWeight="500">Sâu bệnh:</Typography>
                           <Box sx={{ bgcolor: 'rgba(156, 39, 176, 0.05)', borderRadius: 1, border: '1px solid rgba(156, 39, 176, 0.1)', p: 1.5 }}>
                             <List dense disablePadding>
                               {result.image_analysis.pests_and_diseases.map((pest, i) => (
                                 <ListItem key={i} sx={{ py: 0.5 }}>
                                   <ListItemIcon sx={{ minWidth: 36 }}><BugReportIcon color="secondary" fontSize="small" /></ListItemIcon>
                                   <ListItemText primary={pest} />
                                 </ListItem>
                               ))}
                             </List>
                           </Box>
                         </Grid>
                       )}
                        {/* Color Assessment */}
                       {result.image_analysis.color_assessment && (
                         <Grid item xs={12}>
                           <Typography variant="subtitle2" gutterBottom fontWeight="500">Màu sắc:</Typography>
                           <Typography variant="body2" sx={{ p: 1.5, bgcolor: 'rgba(33, 150, 243, 0.05)', borderRadius: 1, border: '1px solid rgba(33, 150, 243, 0.1)' }}>
                             {result.image_analysis.color_assessment}
                           </Typography>
                         </Grid>
                       )}
                     </Grid>
                   </CardContent>
                 </Card>
              </Grid>
            )}

          </Grid>
        </>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
        {hasDeviceRecommendations && (
          <Button
            onClick={() => onApplySuggestions(analysisItem)} // Pass the item back
            variant="contained"
            color="success"
            startIcon={<PlayArrowIcon />}
          >
            Áp dụng đề xuất
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AnalysisHistoryDialog;