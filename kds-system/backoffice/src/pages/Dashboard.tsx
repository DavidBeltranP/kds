import { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, Select, Button, Tooltip } from 'antd';
import {
  DesktopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { configApi, screensApi, ordersApi } from '../services/api';
import { generateDashboardPDF } from '../utils/pdfReport';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Stats {
  screens: { total: number; online: number };
  queues: number;
  ordersToday: number;
}

interface Screen {
  id: string;
  number: number;
  name: string;
  queueName: string;
  status: string;
  lastHeartbeat: string | null;
}

interface OrderHighlight {
  id: string;
  identifier: string;
  channel: string;
  finishTime: number;
  items: { name: string; quantity: number; modifier?: string }[];
}

interface DashboardStats {
  summary: {
    pending: number;
    inProgress: number;
    finishedToday: number;
    cancelledToday: number;
    onTime: number;
    outOfTime: number;
    avgFinishTime: number;
    minFinishTime: number;
    maxFinishTime: number;
  };
  fastestOrder: OrderHighlight | null;
  slowestOrder: OrderHighlight | null;
  byScreen: Array<{
    screenId: string;
    screenName: string;
    queueName: string;
    pending: number;
    finishedToday: number;
    onTime: number;
    outOfTime: number;
    avgFinishTime: number;
  }>;
  byChannel: Array<{
    channel: string;
    total: number;
    onTime: number;
    outOfTime: number;
    avgFinishTime: number;
  }>;
  hourlyStats: Array<{
    hour: number;
    total: number;
    onTime: number;
    outOfTime: number;
  }>;
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLimit, setTimeLimit] = useState(5); // minutos
  const [selectedScreen, setSelectedScreen] = useState<string>('all');
  const chartRef = useRef<ChartJS<'doughnut'>>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [timeLimit]);

  const loadData = async () => {
    try {
      const [statsRes, screensRes, dashboardRes] = await Promise.all([
        configApi.stats(),
        screensApi.getAll(),
        ordersApi.getDashboardStats(timeLimit),
      ]);

      setStats(statsRes.data);
      setScreens(screensRes.data);
      setDashboardStats(dashboardRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      ONLINE: 'green',
      OFFLINE: 'red',
      STANDBY: 'orange',
    };
    return <Tag color={colors[status] || 'default'}>{status}</Tag>;
  };

  // Datos para gráfica Doughnut de A Tiempo vs Fuera de Tiempo
  const timePerformanceData = {
    labels: ['A Tiempo', 'Fuera de Tiempo'],
    datasets: [
      {
        data: [
          dashboardStats?.summary.onTime || 0,
          dashboardStats?.summary.outOfTime || 0,
        ],
        backgroundColor: ['#52c41a', '#ff4d4f'],
        borderColor: ['#52c41a', '#ff4d4f'],
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfica Doughnut de Estado de Órdenes
  const orderStatusData = {
    labels: ['Pendientes', 'Completadas', 'Canceladas'],
    datasets: [
      {
        data: [
          dashboardStats?.summary.pending || 0,
          dashboardStats?.summary.finishedToday || 0,
          dashboardStats?.summary.cancelledToday || 0,
        ],
        backgroundColor: ['#faad14', '#52c41a', '#ff4d4f'],
        borderColor: ['#faad14', '#52c41a', '#ff4d4f'],
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfica de barras por hora
  const hourlyChartData = {
    labels: dashboardStats?.hourlyStats
      .filter(h => h.total > 0 || (h.hour >= 6 && h.hour <= 23))
      .map(h => `${h.hour}:00`) || [],
    datasets: [
      {
        label: 'A Tiempo',
        data: dashboardStats?.hourlyStats
          .filter(h => h.total > 0 || (h.hour >= 6 && h.hour <= 23))
          .map(h => h.onTime) || [],
        backgroundColor: '#52c41a',
      },
      {
        label: 'Fuera de Tiempo',
        data: dashboardStats?.hourlyStats
          .filter(h => h.total > 0 || (h.hour >= 6 && h.hour <= 23))
          .map(h => h.outOfTime) || [],
        backgroundColor: '#ff4d4f',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    cutout: '60%',
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Órdenes por Hora',
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true },
    },
  };

  // Columnas para tabla de pantallas
  const screenColumns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
    { title: 'Cola', dataIndex: 'queueName', key: 'queueName' },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Ultimo Heartbeat',
      dataIndex: 'lastHeartbeat',
      key: 'lastHeartbeat',
      render: (date: string | null) =>
        date ? new Date(date).toLocaleTimeString() : '-',
    },
  ];

  // Columnas para tabla de estadísticas por pantalla
  const screenStatsColumns = [
    { title: 'Pantalla', dataIndex: 'screenName', key: 'screenName' },
    { title: 'Cola', dataIndex: 'queueName', key: 'queueName' },
    {
      title: 'Pendientes',
      dataIndex: 'pending',
      key: 'pending',
      render: (v: number) => <Tag color="gold">{v}</Tag>,
    },
    {
      title: 'Completadas',
      dataIndex: 'finishedToday',
      key: 'finishedToday',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: 'A Tiempo',
      dataIndex: 'onTime',
      key: 'onTime',
      render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span>,
    },
    {
      title: 'Fuera de Tiempo',
      dataIndex: 'outOfTime',
      key: 'outOfTime',
      render: (v: number) => <span style={{ color: '#ff4d4f' }}>{v}</span>,
    },
    {
      title: 'Tiempo Promedio',
      dataIndex: 'avgFinishTime',
      key: 'avgFinishTime',
      render: (v: number) => formatTime(v),
    },
  ];

  // Columnas para tabla de canales
  const channelColumns = [
    { title: 'Canal', dataIndex: 'channel', key: 'channel' },
    { title: 'Total', dataIndex: 'total', key: 'total' },
    {
      title: 'A Tiempo',
      dataIndex: 'onTime',
      key: 'onTime',
      render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span>,
    },
    {
      title: 'Fuera de Tiempo',
      dataIndex: 'outOfTime',
      key: 'outOfTime',
      render: (v: number) => <span style={{ color: '#ff4d4f' }}>{v}</span>,
    },
    {
      title: 'Tiempo Promedio',
      dataIndex: 'avgFinishTime',
      key: 'avgFinishTime',
      render: (v: number) => formatTime(v),
    },
  ];

  // Filtrar estadísticas por pantalla seleccionada
  const getFilteredStats = () => {
    if (!dashboardStats || selectedScreen === 'all') return dashboardStats?.summary;

    const screenData = dashboardStats.byScreen.find(s => s.screenId === selectedScreen);
    if (!screenData) return dashboardStats.summary;

    return {
      pending: screenData.pending,
      inProgress: 0,
      finishedToday: screenData.finishedToday,
      cancelledToday: 0,
      onTime: screenData.onTime,
      outOfTime: screenData.outOfTime,
      avgFinishTime: screenData.avgFinishTime,
      minFinishTime: 0,
      maxFinishTime: 0,
    };
  };

  const filteredStats = getFilteredStats();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const totalOrders = (dashboardStats?.summary.onTime || 0) + (dashboardStats?.summary.outOfTime || 0);
  const onTimePercentage = totalOrders > 0
    ? Math.round((dashboardStats?.summary.onTime || 0) / totalOrders * 100)
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>Tiempo límite:</span>
          <Select
            value={timeLimit}
            onChange={setTimeLimit}
            style={{ width: 120 }}
            options={[
              { value: 3, label: '3 minutos' },
              { value: 5, label: '5 minutos' },
              { value: 7, label: '7 minutos' },
              { value: 10, label: '10 minutos' },
            ]}
          />
          <span>Filtrar por pantalla:</span>
          <Select
            value={selectedScreen}
            onChange={setSelectedScreen}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: 'Todas' },
              ...screens.map(s => ({ value: s.id, label: s.name })),
            ]}
          />
          <Tooltip title="Actualizar">
            <Button icon={<ReloadOutlined />} onClick={loadData} />
          </Tooltip>
          <Tooltip title="Descargar Reporte PDF">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => {
                if (dashboardStats) {
                  generateDashboardPDF(dashboardStats, screens, timeLimit);
                }
              }}
              disabled={!dashboardStats}
            >
              Reporte PDF
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Pantallas Online"
              value={stats?.screens.online || 0}
              suffix={`/ ${stats?.screens.total || 0}`}
              prefix={<DesktopOutlined />}
              valueStyle={{
                color: stats?.screens.online === stats?.screens.total ? '#3f8600' : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Pendientes"
              value={filteredStats?.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Completadas Hoy"
              value={filteredStats?.finishedToday || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="A Tiempo"
              value={filteredStats?.onTime || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Fuera de Tiempo"
              value={filteredStats?.outOfTime || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Tiempo Promedio"
              value={formatTime(filteredStats?.avgFinishTime || 0)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Gráficas */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="Rendimiento de Tiempo" size="small">
            <div style={{ height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Doughnut ref={chartRef} data={timePerformanceData} options={doughnutOptions} />
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 'bold', color: onTimePercentage >= 80 ? '#52c41a' : '#ff4d4f' }}>
                {onTimePercentage}% a tiempo
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Estado de Órdenes" size="small">
            <div style={{ height: 280 }}>
              <Doughnut data={orderStatusData} options={doughnutOptions} />
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Órdenes por Hora" size="small">
            <div style={{ height: 280 }}>
              <Bar data={hourlyChartData} options={barOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabla por Pantalla */}
      <Card title="Estadísticas por Pantalla" size="small" style={{ marginBottom: 16 }}>
        <Table
          dataSource={dashboardStats?.byScreen || []}
          columns={screenStatsColumns}
          rowKey="screenId"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Tabla por Canal */}
      <Card title="Estadísticas por Canal" size="small" style={{ marginBottom: 16 }}>
        <Table
          dataSource={dashboardStats?.byChannel || []}
          columns={channelColumns}
          rowKey="channel"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Estado de Pantallas */}
      <Card title="Estado de Pantallas" size="small">
        <Table
          dataSource={screens}
          columns={screenColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
