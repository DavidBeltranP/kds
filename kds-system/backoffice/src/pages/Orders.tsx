import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Popconfirm,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Modal,
  Descriptions,
  List,
  InputNumber,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  UndoOutlined,
  CloseCircleOutlined,
  ClearOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { ordersApi, queuesApi, screensApi, mirrorApi } from '../services/api';
import { useIsTestMode } from '../store/testModeStore';
import dayjs from 'dayjs';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers: string[];
}

interface Order {
  id: string;
  externalId: string;
  orderNumber: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  queueName: string;
  screenName: string | null;
  items: OrderItem[];
  createdAt: string;
  finishedAt: string | null;
  finishTime: number | null;
  metadata: any;
}

interface Queue {
  id: string;
  name: string;
}

interface Screen {
  id: string;
  name: string;
}

export function Orders() {
  const isTestMode = useIsTestMode();
  const [orders, setOrders] = useState<Order[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupHours, setCleanupHours] = useState(24);
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    queueId: undefined as string | undefined,
    screenId: undefined as string | undefined,
    search: '',
    date: null as dayjs.Dayjs | null,
  });
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    finishedToday: 0,
    avgFinishTime: 0,
  });

  // Cargar datos del mirror cuando está en modo prueba
  const loadMirrorData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await mirrorApi.getOrders({
        screen: filters.screenId,
        queue: filters.queueId,
      });

      // Transformar datos del mirror al formato esperado
      const mirrorOrders: Order[] = (data.orders || []).map((o: any) => ({
        id: o.id,
        externalId: o.externalId || o.id,
        orderNumber: o.identifier,
        status: o.status,
        queueName: o.queue || '-',
        screenName: o.screen || '-',
        items: (o.items || []).map((item: any) => ({
          id: item.id || String(Math.random()),
          name: item.name,
          quantity: item.quantity,
          modifiers: item.subitems?.map((s: any) => s.name) || [],
        })),
        createdAt: o.createdAt,
        finishedAt: null,
        finishTime: null,
        metadata: {},
      }));

      setOrders(mirrorOrders);
      setStats({
        pending: mirrorOrders.filter((o) => o.status === 'PENDING').length,
        inProgress: 0,
        finishedToday: 0,
        avgFinishTime: 0,
      });
    } catch (error) {
      message.error('Error cargando ordenes del mirror');
    } finally {
      setLoading(false);
    }
  }, [filters.screenId, filters.queueId]);

  useEffect(() => {
    loadQueues();
    loadScreens();
  }, []);

  useEffect(() => {
    if (isTestMode) {
      loadMirrorData();
    } else {
      loadData();
    }
  }, [filters, isTestMode, loadMirrorData]);

  const loadQueues = async () => {
    try {
      const { data } = await queuesApi.getAll();
      setQueues(data);
    } catch (error) {
      console.error('Error loading queues:', error);
    }
  };

  const loadScreens = async () => {
    try {
      const { data } = await screensApi.getAll();
      setScreens(data);
    } catch (error) {
      console.error('Error loading screens:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.queueId) params.queueId = filters.queueId;
      if (filters.screenId) params.screenId = filters.screenId;
      if (filters.search) params.search = filters.search;
      if (filters.date) params.date = filters.date.format('YYYY-MM-DD');

      const [ordersRes, statsRes] = await Promise.all([
        ordersApi.getAll(params),
        ordersApi.getStats(),
      ]);

      // El backend devuelve { orders, total }
      const ordersData = ordersRes.data.orders || ordersRes.data;
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setStats(statsRes.data);
    } catch (error) {
      message.error('Error cargando ordenes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const handleUndo = async (orderId: string) => {
    try {
      await ordersApi.undo(orderId);
      message.success('Orden revertida a pendiente');
      loadData();
    } catch (error) {
      message.error('Error revirtiendo orden');
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await ordersApi.cancel(orderId, 'Cancelada desde backoffice');
      message.success('Orden cancelada');
      loadData();
    } catch (error) {
      message.error('Error cancelando orden');
    }
  };

  const handleCleanup = async () => {
    try {
      await ordersApi.cleanup(cleanupHours);
      message.success('Limpieza completada');
      setCleanupModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Error en limpieza');
    }
  };

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'gold', text: 'Pendiente' },
      IN_PROGRESS: { color: 'blue', text: 'En Progreso' },
      FINISHED: { color: 'green', text: 'Finalizada' },
      CANCELLED: { color: 'red', text: 'Cancelada' },
    };
    const { color, text } = config[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: '# Orden',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 100,
      render: (num: string) => <strong>{num}</strong>,
    },
    {
      title: 'ID Externo',
      dataIndex: 'externalId',
      key: 'externalId',
      width: 120,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Cola',
      dataIndex: 'queueName',
      key: 'queueName',
      width: 100,
    },
    {
      title: 'Pantalla',
      dataIndex: 'screenName',
      key: 'screenName',
      width: 120,
      render: (name: string | null) => name || '-',
    },
    {
      title: 'Items',
      key: 'items',
      width: 200,
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={0}>
          {record.items.slice(0, 2).map((item, i) => (
            <span key={i} style={{ fontSize: 12 }}>
              {item.quantity}x {item.name}
            </span>
          ))}
          {record.items.length > 2 && (
            <span style={{ fontSize: 11, color: '#888' }}>
              +{record.items.length - 2} mas...
            </span>
          )}
        </Space>
      ),
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('DD/MM HH:mm:ss'),
    },
    {
      title: 'Tiempo',
      key: 'finishTime',
      width: 100,
      render: (_: any, record: Order) => {
        if (record.finishTime) {
          return <Tag color="green">{record.finishTime}s</Tag>;
        }
        if (record.status === 'PENDING' || record.status === 'IN_PROGRESS') {
          const elapsed = Math.floor(
            (Date.now() - new Date(record.createdAt).getTime()) / 1000
          );
          return <Tag color="blue">{elapsed}s</Tag>;
        }
        return '-';
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      render: (_: any, record: Order) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetails(record)}
          />
          {record.status === 'FINISHED' && (
            <Popconfirm
              title="Revertir orden a pendiente?"
              onConfirm={() => handleUndo(record.id)}
            >
              <Button icon={<UndoOutlined />} size="small" />
            </Popconfirm>
          )}
          {(record.status === 'PENDING' || record.status === 'IN_PROGRESS') && (
            <Popconfirm
              title="Cancelar orden?"
              onConfirm={() => handleCancel(record.id)}
            >
              <Button icon={<CloseCircleOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Función para refrescar (usa mirror o local según modo)
  const handleRefresh = () => {
    if (isTestMode) {
      loadMirrorData();
    } else {
      loadData();
    }
  };

  return (
    <div>
      {/* Alert de modo prueba */}
      {isTestMode && (
        <Alert
          message={
            <Space>
              <ExperimentOutlined />
              <strong>MODO PRUEBA ACTIVO</strong> - Mostrando datos reales del SQL Server del local (solo lectura)
            </Space>
          }
          type="warning"
          showIcon={false}
          style={{ marginBottom: 16 }}
          banner
        />
      )}

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Pendientes" value={stats.pending} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="En Progreso"
              value={stats.inProgress}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Finalizadas Hoy"
              value={stats.finishedToday}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Tiempo Promedio"
              value={stats.avgFinishTime}
              suffix="seg"
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          {/* Filtros */}
          <Col xs={24} sm={12} md={6} lg={4}>
            <Select
              placeholder="Estado"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Select.Option value="PENDING">Pendiente</Select.Option>
              <Select.Option value="IN_PROGRESS">En Progreso</Select.Option>
              <Select.Option value="FINISHED">Finalizada</Select.Option>
              <Select.Option value="CANCELLED">Cancelada</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={4}>
            <Select
              placeholder="Cola"
              allowClear
              style={{ width: '100%' }}
              value={filters.queueId}
              onChange={(value) => setFilters({ ...filters, queueId: value })}
            >
              {queues.map((q) => (
                <Select.Option key={q.id} value={q.id}>
                  {q.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={4}>
            <Select
              placeholder="Pantalla"
              allowClear
              style={{ width: '100%' }}
              value={filters.screenId}
              onChange={(value) => setFilters({ ...filters, screenId: value })}
            >
              {screens.map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={4}>
            <DatePicker
              placeholder="Fecha"
              style={{ width: '100%' }}
              value={filters.date}
              onChange={(date) => setFilters({ ...filters, date })}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Input
              placeholder="Buscar por # orden"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Col>

          {/* Acciones */}
          <Col xs={24} lg={7}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Actualizar
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={() =>
                  setFilters({
                    status: undefined,
                    queueId: undefined,
                    screenId: undefined,
                    search: '',
                    date: null,
                  })
                }
              >
                Limpiar Filtros
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Acciones de mantenimiento */}
        <Row gutter={[16, 16]} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Col xs={24}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                icon={<DeleteOutlined />}
                danger
                type="dashed"
                onClick={() => setCleanupModalOpen(true)}
              >
                Limpieza Antigua
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Card title={`Ordenes (${orders.length})`}>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} ordenes`,
          }}
          size="small"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={`Orden #${selectedOrder?.orderNumber}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="ID">{selectedOrder.id}</Descriptions.Item>
              <Descriptions.Item label="ID Externo">
                {selectedOrder.externalId}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Cola">{selectedOrder.queueName}</Descriptions.Item>
              <Descriptions.Item label="Pantalla">
                {selectedOrder.screenName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tiempo Finalizacion">
                {selectedOrder.finishTime ? `${selectedOrder.finishTime}s` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Creada" span={2}>
                {dayjs(selectedOrder.createdAt).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
              {selectedOrder.finishedAt && (
                <Descriptions.Item label="Finalizada" span={2}>
                  {dayjs(selectedOrder.finishedAt).format('DD/MM/YYYY HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <h4 style={{ marginTop: 16 }}>Items ({selectedOrder.items.length})</h4>
            <List
              dataSource={selectedOrder.items}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.quantity}x ${item.name}`}
                    description={
                      item.modifiers.length > 0
                        ? item.modifiers.join(', ')
                        : 'Sin modificadores'
                    }
                  />
                </List.Item>
              )}
            />

            {selectedOrder.metadata && Object.keys(selectedOrder.metadata).length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}>Metadata</h4>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(selectedOrder.metadata, null, 2)}
                </pre>
              </>
            )}
          </>
        )}
      </Modal>

      {/* Cleanup Modal */}
      <Modal
        title="Limpieza de Ordenes"
        open={cleanupModalOpen}
        onOk={handleCleanup}
        onCancel={() => setCleanupModalOpen(false)}
        okText="Ejecutar Limpieza"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
      >
        <p>
          Esta accion eliminara todas las ordenes finalizadas y canceladas que tengan
          mas de las horas especificadas.
        </p>
        <Space>
          <span>Eliminar ordenes mayores a:</span>
          <InputNumber
            min={1}
            max={720}
            value={cleanupHours}
            onChange={(v) => setCleanupHours(v || 24)}
          />
          <span>horas</span>
        </Space>
      </Modal>
    </div>
  );
}
