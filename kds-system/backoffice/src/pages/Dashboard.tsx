import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin } from 'antd';
import {
  DesktopOutlined,
  OrderedListOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { configApi, screensApi, ordersApi } from '../services/api';

interface Stats {
  screens: { total: number; online: number };
  queues: number;
  ordersToday: number;
}

interface Screen {
  id: string;
  name: string;
  ip: string;
  queueName: string;
  status: string;
  lastHeartbeat: string | null;
}

interface OrderStats {
  pending: number;
  inProgress: number;
  finishedToday: number;
  avgFinishTime: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, screensRes, orderStatsRes] = await Promise.all([
        configApi.stats(),
        screensApi.getAll(),
        ordersApi.getStats(),
      ]);

      setStats(statsRes.data);
      setScreens(screensRes.data);
      setOrderStats(orderStatsRes.data);
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

  const columns = [
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h2>Dashboard</h2>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pantallas Online"
              value={stats?.screens.online || 0}
              suffix={`/ ${stats?.screens.total || 0}`}
              prefix={<DesktopOutlined />}
              valueStyle={{
                color:
                  stats?.screens.online === stats?.screens.total
                    ? '#3f8600'
                    : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ordenes Pendientes"
              value={orderStats?.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completadas Hoy"
              value={orderStats?.finishedToday || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tiempo Promedio"
              value={orderStats?.avgFinishTime || 0}
              suffix="seg"
              prefix={<OrderedListOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Screens Table */}
      <Card title="Estado de Pantallas">
        <Table
          dataSource={screens}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
