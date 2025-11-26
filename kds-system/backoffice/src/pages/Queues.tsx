import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  Collapse,
  List,
  InputNumber,
  Statistic,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  ApiOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { queuesApi } from '../services/api';

interface Channel {
  id: string;
  type: 'MAXPOINT' | 'API' | 'WEBHOOK';
  name: string;
  config: any;
  enabled: boolean;
}

interface Filter {
  id: string;
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'IN' | 'NOT_EQUALS';
  value: string;
}

interface QueueStats {
  pending: number;
  inProgress: number;
  completed: number;
  avgTime: number;
}

interface Queue {
  id: string;
  name: string;
  description: string | null;
  balanceMode: 'ROUND_ROBIN' | 'LEAST_LOADED' | 'MANUAL';
  priority: number;
  channels: Channel[];
  filters: Filter[];
  screensCount: number;
  stats?: QueueStats;
}

export function Queues() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [form] = Form.useForm();
  const [channelForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await queuesApi.getAll();

      // Cargar stats de cada cola
      const queuesWithStats = await Promise.all(
        data.map(async (q: Queue) => {
          try {
            const statsRes = await queuesApi.getStats(q.id);
            return { ...q, stats: statsRes.data };
          } catch {
            return q;
          }
        })
      );

      setQueues(queuesWithStats);
    } catch (error) {
      message.error('Error cargando colas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingQueue(null);
    form.resetFields();
    form.setFieldsValue({ balanceMode: 'ROUND_ROBIN', priority: 0 });
    setModalOpen(true);
  };

  const handleEdit = (queue: Queue) => {
    setEditingQueue(queue);
    form.setFieldsValue({
      name: queue.name,
      description: queue.description,
      balanceMode: queue.balanceMode,
      priority: queue.priority,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingQueue) {
        await queuesApi.update(editingQueue.id, values);
        message.success('Cola actualizada');
      } else {
        await queuesApi.create(values);
        message.success('Cola creada');
      }

      setModalOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Error guardando cola');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await queuesApi.delete(id);
      message.success('Cola eliminada');
      loadData();
    } catch (error) {
      message.error('Error eliminando cola');
    }
  };

  const handleAddChannel = (queue: Queue) => {
    setSelectedQueue(queue);
    channelForm.resetFields();
    channelForm.setFieldsValue({ type: 'MAXPOINT', enabled: true });
    setChannelModalOpen(true);
  };

  const handleSaveChannel = async () => {
    if (!selectedQueue) return;
    try {
      const values = await channelForm.validateFields();
      await queuesApi.addChannel(selectedQueue.id, values);
      message.success('Canal agregado');
      setChannelModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Error agregando canal');
    }
  };

  const handleDeleteChannel = async (queueId: string, channelId: string) => {
    try {
      await queuesApi.deleteChannel(queueId, channelId);
      message.success('Canal eliminado');
      loadData();
    } catch (error) {
      message.error('Error eliminando canal');
    }
  };

  const handleAddFilter = (queue: Queue) => {
    setSelectedQueue(queue);
    filterForm.resetFields();
    setFilterModalOpen(true);
  };

  const handleSaveFilter = async () => {
    if (!selectedQueue) return;
    try {
      const values = await filterForm.validateFields();
      await queuesApi.addFilter(selectedQueue.id, values);
      message.success('Filtro agregado');
      setFilterModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Error agregando filtro');
    }
  };

  const handleDeleteFilter = async (queueId: string, filterId: string) => {
    try {
      await queuesApi.deleteFilter(queueId, filterId);
      message.success('Filtro eliminado');
      loadData();
    } catch (error) {
      message.error('Error eliminando filtro');
    }
  };

  const handleResetBalance = async (queueId: string) => {
    try {
      await queuesApi.resetBalance(queueId);
      message.success('Balance reseteado');
    } catch (error) {
      message.error('Error reseteando balance');
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: Queue) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.description && (
            <span style={{ fontSize: 12, color: '#888' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balanceMode',
      key: 'balanceMode',
      width: 120,
      render: (mode: string) => {
        const colors: Record<string, string> = {
          ROUND_ROBIN: 'blue',
          LEAST_LOADED: 'green',
          MANUAL: 'orange',
        };
        const labels: Record<string, string> = {
          ROUND_ROBIN: 'Round Robin',
          LEAST_LOADED: 'Menos Cargada',
          MANUAL: 'Manual',
        };
        return <Tag color={colors[mode]}>{labels[mode] || mode}</Tag>;
      },
    },
    {
      title: 'Pantallas',
      dataIndex: 'screensCount',
      key: 'screensCount',
      width: 90,
      align: 'center' as const,
      render: (count: number) => <Tag>{count}</Tag>,
    },
    {
      title: 'Canales',
      key: 'channels',
      width: 100,
      render: (_: any, record: Queue) => (
        <Space size={2} wrap>
          {record.channels.length > 0 ? (
            record.channels.map((ch) => (
              <Tag key={ch.id} color={ch.enabled ? 'green' : 'default'} style={{ margin: 0 }}>
                {ch.type}
              </Tag>
            ))
          ) : (
            <Tag>-</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Pendientes',
      key: 'pending',
      width: 90,
      align: 'center' as const,
      render: (_: any, record: Queue) =>
        record.stats ? (
          <Tag color="gold">{record.stats.pending}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Completadas',
      key: 'completed',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: Queue) =>
        record.stats ? (
          <Tag color="green">{record.stats.completed}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_: any, record: Queue) => (
        <Space size={4}>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Button
            icon={<SyncOutlined />}
            size="small"
            onClick={() => handleResetBalance(record.id)}
            title="Resetear Balance"
          />
          <Popconfirm title="Eliminar cola?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: Queue) => (
    <div style={{ padding: '0 16px' }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic title="Pendientes" value={record.stats?.pending || 0} />
        </Col>
        <Col span={6}>
          <Statistic title="En Progreso" value={record.stats?.inProgress || 0} />
        </Col>
        <Col span={6}>
          <Statistic title="Completadas" value={record.stats?.completed || 0} />
        </Col>
        <Col span={6}>
          <Statistic
            title="Tiempo Promedio"
            value={record.stats?.avgTime || 0}
            suffix="seg"
          />
        </Col>
      </Row>

      <Collapse
        items={[
          {
            key: 'channels',
            label: (
              <Space>
                <ApiOutlined />
                Canales ({record.channels.length})
              </Space>
            ),
            extra: (
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddChannel(record);
                }}
              >
                Agregar
              </Button>
            ),
            children: (
              <List
                dataSource={record.channels}
                renderItem={(channel) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="delete"
                        title="Eliminar canal?"
                        onConfirm={() => handleDeleteChannel(record.id, channel.id)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          {channel.name}
                          <Tag color={channel.enabled ? 'green' : 'default'}>
                            {channel.type}
                          </Tag>
                        </Space>
                      }
                      description={JSON.stringify(channel.config)}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'Sin canales configurados' }}
              />
            ),
          },
          {
            key: 'filters',
            label: (
              <Space>
                <FilterOutlined />
                Filtros ({record.filters.length})
              </Space>
            ),
            extra: (
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddFilter(record);
                }}
              >
                Agregar
              </Button>
            ),
            children: (
              <List
                dataSource={record.filters}
                renderItem={(filter) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="delete"
                        title="Eliminar filtro?"
                        onConfirm={() => handleDeleteFilter(record.id, filter.id)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${filter.field} ${filter.operator} ${filter.value}`}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'Sin filtros configurados' }}
              />
            ),
          },
        ]}
      />
    </div>
  );

  return (
    <div>
      <Card
        title="Gestion de Colas"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Actualizar
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Nueva Cola
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={queues}
          columns={columns}
          rowKey="id"
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* Modal Crear/Editar Cola */}
      <Modal
        title={editingQueue ? 'Editar Cola' : 'Nueva Cola'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'Ingrese el nombre' }]}
          >
            <Input placeholder="LINEAS" />
          </Form.Item>
          <Form.Item name="description" label="Descripcion">
            <Input.TextArea placeholder="Descripcion de la cola" rows={2} />
          </Form.Item>
          <Form.Item
            name="balanceMode"
            label="Modo de Balance"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="ROUND_ROBIN">
                Round Robin - Distribucion equitativa
              </Select.Option>
              <Select.Option value="LEAST_LOADED">
                Menos Cargada - Asignar al que tenga menos ordenes
              </Select.Option>
              <Select.Option value="MANUAL">Manual - Sin balanceo automatico</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="Prioridad">
            <InputNumber min={0} max={100} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Agregar Canal */}
      <Modal
        title="Agregar Canal"
        open={channelModalOpen}
        onOk={handleSaveChannel}
        onCancel={() => setChannelModalOpen(false)}
        okText="Agregar"
        cancelText="Cancelar"
      >
        <Form form={channelForm} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Canal MAXPOINT" />
          </Form.Item>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="MAXPOINT">MAXPOINT (SQL Server)</Select.Option>
              <Select.Option value="API">API REST</Select.Option>
              <Select.Option value="WEBHOOK">Webhook</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="enabled" label="Habilitado" valuePropName="checked">
            <Select defaultValue={true}>
              <Select.Option value={true}>Si</Select.Option>
              <Select.Option value={false}>No</Select.Option>
            </Select>
          </Form.Item>
          <Divider>Configuracion</Divider>
          <Form.Item
            name={['config', 'connectionString']}
            label="Connection String (MAXPOINT)"
          >
            <Input.TextArea
              placeholder="Server=...;Database=...;User Id=...;Password=..."
              rows={2}
            />
          </Form.Item>
          <Form.Item name={['config', 'pollingInterval']} label="Intervalo Polling (ms)">
            <InputNumber min={1000} max={60000} step={1000} defaultValue={3000} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Agregar Filtro */}
      <Modal
        title="Agregar Filtro"
        open={filterModalOpen}
        onOk={handleSaveFilter}
        onCancel={() => setFilterModalOpen(false)}
        okText="Agregar"
        cancelText="Cancelar"
      >
        <Form form={filterForm} layout="vertical">
          <Form.Item name="field" label="Campo" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="linea">Linea</Select.Option>
              <Select.Option value="orderType">Tipo de Orden</Select.Option>
              <Select.Option value="channel">Canal</Select.Option>
              <Select.Option value="store">Tienda</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="operator" label="Operador" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="EQUALS">Igual a</Select.Option>
              <Select.Option value="NOT_EQUALS">Diferente de</Select.Option>
              <Select.Option value="CONTAINS">Contiene</Select.Option>
              <Select.Option value="IN">En lista</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="value" label="Valor" rules={[{ required: true }]}>
            <Input placeholder="Ej: SANDUCHE o 1,2,3 para lista" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
