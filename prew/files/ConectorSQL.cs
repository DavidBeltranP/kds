using System.Data;
using Microsoft.Data.SqlClient;
using System.Reflection;
using KDS.Interfaces;

namespace KDS.Repositorios
{
    public class ConectorSQL : IConector
    {
        public string query;
        public string msgTitulo;
        public string getLastError;
        public DataSet tablas = new DataSet();

        private SqlConnection sesion = new SqlConnection();
        private List<datoConsulta> datosConsultas = new List<datoConsulta>();
        private string datosConexion;

        private struct datoConsulta
        {
            public string nombreVariable;
            public System.Data.SqlDbType tipoVariable;
            public string contenidoVariable;
        }

        /// <summary>
        /// Retorna la cadena con los datos de conexión.
        /// </summary>
        /// <param name="conexionIP">Servidor/Host de conexion</param>
        /// <param name="conexionPass">Contraseña de la conexión</param>
        /// <param name="conexionUser">Nombre del usuario de la conexión</param>
        /// <param name="conexionCATALOG">Nombre del catálogo de la conexión</param>
        public void sesionConexion(string conexionIP, string conexionUser, string conexionPass, string conexionCATALOG)
        {
            this.datosConexion = "Data Source=" + conexionIP + ";User=" + conexionUser + ";Password=" + conexionPass + "; Initial Catalog=" + conexionCATALOG + ";Encrypt=true;TrustServerCertificate=true;";
            this.sesion.ConnectionString = this.datosConexion;
        }


        /// <summary>
        /// Abre una sesion.
        /// Requiere haber cargado los datos de conexión
        /// </summary>
        public int sesionAbrir(bool mensaje)
        {
            try
            {
                if (this.datosConexion == "")
                {
                    throw new Exception("Los datos de conexión están vacíos");
                }

                sesion.ConnectionString = datosConexion;
                sesion.Open();

                return 1;

            }
            catch (Exception ex)
            {
                throw new Exception("Error al abrir sesion: " + ex.Message);
            }

        }

        /// <summary>
        /// Cierra la sesión iniciada por este objeto.
        /// </summary>
        public int sesionCerrar()
        {
            try
            {
                this.sesion.Close();
                return 1;
            }
            catch (SqlException ex)
            {
                throw new Exception("Error al cerrar sesion: " + ex.Message);
            }
        }

        /// <summary>
        /// Abre una conexión y la cierra indicando mediante un mensaje por pantalla el éxito de la operación.
        /// </summary>
        public void sesionTestear()
        {
            if (this.sesionAbrir(true) == 1)
            {
                this.sesionCerrar();
            }
        }

        /// <summary>
        /// Carga los valores necesarios para una variable de consulta SQL.
        /// </summary>
        /// <param name="nombre">Nombre de la variable.</param>
        /// <param name="tipo">Tipo SqlDbType.</param>
        /// <param name="contenido">Contenido de la variable.</param>
        /// <remarks></remarks>
        public void consultaDatos(string nombre, System.Data.SqlDbType tipo, string contenido)
        {
            datoConsulta unaConsulta = new datoConsulta();
            unaConsulta.nombreVariable = nombre;
            unaConsulta.tipoVariable = tipo;
            unaConsulta.contenidoVariable = contenido;
            this.datosConsultas.Add(unaConsulta);
        }

        /// <summary>
        /// Realiza una consulta sobre la conexión realizada
        /// </summary>

        public int consultaModificar(string query)
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();

                cmd.CommandText = query;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.Text;
                cmd.CommandTimeout = 1000;
                this.sesionAbrir(false);
                cmd.ExecuteNonQuery();
                this.sesionCerrar();

                return 1;
            }
            catch (SqlException ex)
            {
                this.sesionCerrar();
                throw new Exception("Error en consultaModificar: " + ex.Message);
            }
        }

        /// <summary>
        /// Realiza una consulta sobre la conexión realizada
        /// </summary>
        /// <param name="nombreTabla">Nombre de la tabla donde se guardara el resultado.</param>
        public DataTable consultaResultados()
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                cmd.CommandText = this.query;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.Text;
                cmd.CommandTimeout = 1000;

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();
                DataTable tabla = new DataTable();

                adaptadordatos.SelectCommand = cmd;
                adaptadordatos.Fill(tabla);

                return tabla;
            }
            catch (SqlException ex)
            {
                throw new Exception(MethodBase.GetCurrentMethod().Name + ": " + ex.Message);
            }
        }


        /// <summary>
        /// Realiza una consulta sobre la conexión realizada
        /// </summary>
        /// <param name="SP_Nombre">Nombre del Store Procedure.</param>
        /// <param name="nombreTabla">Nombre de la tabla donde se almacenará</param>
        public int consultaEjecutarSP(string SP_Nombre)
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                cmd.CommandText = SP_Nombre;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 1000;

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();
                DataTable tabla = new DataTable();

                adaptadordatos.SelectCommand = cmd;
                adaptadordatos.Fill(tabla);
                return 1;
            }
            catch (SqlException ex)
            {
                throw new Exception(MethodBase.GetCurrentMethod().Name + ": " + ex.Message);
            }
        }

        public DataTable consultaEjecutarSPTabla(string SP_Nombre)
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                cmd.CommandText = SP_Nombre;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 1000;

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();
                DataTable tabla = new DataTable();

                adaptadordatos.SelectCommand = cmd;
                adaptadordatos.Fill(tabla);
                return tabla;
            }
            catch (SqlException ex)
            {
                throw new Exception($"{MethodBase.GetCurrentMethod().Name}: SP {SP_Nombre} - {ex.Message}");
            }
        }

        public int consultaEjecutarSPEscalar(string SP_Nombre)
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                cmd.CommandText = SP_Nombre;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 1000;

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();

                this.sesionAbrir(false);
                int resultado = (int)cmd.ExecuteScalar();
                this.sesionCerrar();
                return resultado;
            }
            catch (SqlException ex)
            {
                throw new Exception(MethodBase.GetCurrentMethod().Name + ": " + ex.Message);
            }
        }

        public void consultaEjecutarSPSinResultados(string SP_Nombre)
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                cmd.CommandText = SP_Nombre;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 1000;

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();

                this.sesionAbrir(false);
                cmd.ExecuteNonQuery();
                this.sesionCerrar();
            }
            catch (SqlException ex)
            {
                throw new Exception(MethodBase.GetCurrentMethod().Name + ": " + ex.Message);
            }
        }

        public int ConsultaEjecutarQueryEscalarEntero()
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                cmd.CommandText = this.query;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.Text;
                cmd.CommandTimeout = 1000;

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();

                this.sesionAbrir(false);
                int resultado = (int)cmd.ExecuteScalar();
                this.sesionCerrar();
                return resultado;
            }
            catch (SqlException ex)
            {
                throw new Exception(MethodBase.GetCurrentMethod().Name + ": " + ex.Message);
            }
        }

        public string ConsultaEjecutarQueryEscalarCadena()
        {
            try
            {
                SqlDataAdapter adaptadordatos = new SqlDataAdapter();
                SqlCommand cmd = new SqlCommand();

                cmd.CommandText = this.query;
                cmd.Connection = this.sesion;
                cmd.CommandType = CommandType.Text;
                cmd.CommandTimeout = 1000;

                foreach (datoConsulta dato in this.datosConsultas)
                {
                    cmd.Parameters.Add(new SqlParameter(dato.nombreVariable, dato.tipoVariable));
                    cmd.Parameters[dato.nombreVariable].Value = dato.contenidoVariable;
                }
                datosConsultas.Clear();

                this.sesionAbrir(false);
                string resultado = (string)cmd.ExecuteScalar();
                this.sesionCerrar();
                return resultado;
            }
            catch (SqlException ex)
            {
                throw new Exception(MethodBase.GetCurrentMethod().Name + ": " + ex.Message);
            }
        }
    }
}
