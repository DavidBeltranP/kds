import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Popconfirm,
  Typography,
  Switch,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { usersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const { Title } = Typography;

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const roleLabels: Record<string, { label: string; color: string; description: string }> = {
  ADMIN: {
    label: 'Administrador',
    color: 'red',
    description: 'Acceso total al sistema',
  },
  OPERATOR: {
    label: 'Operador',
    color: 'blue',
    description: 'Puede gestionar pantallas y ordenes',
  },
  VIEWER: {
    label: 'Operaciones',
    color: 'green',
    description: 'Solo puede ver el Dashboard',
  },
};

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuthStore();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      message.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'VIEWER' });
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await usersApi.delete(id);
      message.success('Usuario eliminado');
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.toggleActive(user.id);
      message.success(user.active ? 'Usuario desactivado' : 'Usuario activado');
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        // Si no se proporciona contraseña, no enviarla
        const updateData = { ...values };
        if (!updateData.password) {
          delete updateData.password;
        }
        await usersApi.update(editingUser.id, updateData);
        message.success('Usuario actualizado');
      } else {
        await usersApi.create(values);
        message.success('Usuario creado');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const columns = [
    {
      title: 'Usuario',
      key: 'user',
      render: (_: any, record: User) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleInfo = roleLabels[role];
        return (
          <Tooltip title={roleInfo.description}>
            <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: User) => (
        <Switch
          checked={active}
          onChange={() => handleToggleActive(record)}
          disabled={record.id === currentUser?.userId}
          checkedChildren="Activo"
          unCheckedChildren="Inactivo"
        />
      ),
    },
    {
      title: 'Creado',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('es-EC'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.id !== currentUser?.userId && (
            <Popconfirm
              title="Eliminar usuario"
              description="Esta accion no se puede deshacer"
              onConfirm={() => handleDelete(record.id)}
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Eliminar">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Usuarios
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
            Actualizar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Nuevo Usuario
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Nombre"
            rules={[
              { required: true, message: 'El nombre es requerido' },
              { min: 2, message: 'Minimo 2 caracteres' },
            ]}
          >
            <Input placeholder="Nombre completo" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'El email es requerido' },
              { type: 'email', message: 'Email invalido' },
            ]}
          >
            <Input placeholder="correo@ejemplo.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'Nueva Contrasena (dejar vacio para no cambiar)' : 'Contrasena'}
            rules={
              editingUser
                ? [{ min: 6, message: 'Minimo 6 caracteres' }]
                : [
                    { required: true, message: 'La contrasena es requerida' },
                    { min: 6, message: 'Minimo 6 caracteres' },
                  ]
            }
          >
            <Input.Password placeholder="******" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Rol"
            rules={[{ required: true, message: 'Selecciona un rol' }]}
          >
            <Select placeholder="Seleccionar rol">
              <Select.Option value="ADMIN">
                <Space>
                  <Tag color="red">Administrador</Tag>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    Acceso total
                  </span>
                </Space>
              </Select.Option>
              <Select.Option value="OPERATOR">
                <Space>
                  <Tag color="blue">Operador</Tag>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    Gestiona pantallas y ordenes
                  </span>
                </Space>
              </Select.Option>
              <Select.Option value="VIEWER">
                <Space>
                  <Tag color="green">Operaciones</Tag>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    Solo Dashboard
                  </span>
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Actualizar' : 'Crear'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
