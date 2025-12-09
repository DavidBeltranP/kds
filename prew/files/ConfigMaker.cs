using KDS.Entidades;
using KDS.Interfaces;
using KDS.Repositorios;
using System.Data.SqlClient;
using System.Data;
using System.Text.Json;
using System.Reflection;
using System.Net;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization.Formatters.Binary;
using System.Runtime.Serialization;

namespace KDS.Modulos
{
    public class ConfigMaker
    {
        public Semaphore procesoPantalla { get; set; }

        private static ConfigMaker instance = null;

        private ConfigMaker()
        {

        }

        public static ConfigMaker Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = new ConfigMaker();

                }
                return instance;
            }
        }
        public Configuracion configVisible { get; set; }

        private Configuracion config;

        /// <summary>
        /// Leer la información de la base de datos
        /// </summary>
        /// <param name="conexion">Conexión a la base de KDS.</param>
        /// <exception cref="Exception"></exception>
        public void leerBaseDatos(ConexionKDS conexion)
        {
            try
            {
                Configuracion configuracion;
                IConector conector = new ConectorSQL();
                conector.sesionConexion(conexion.ip, conexion.usuario, conexion.clave, conexion.catalogo);
                DataTable tabla = conector.consultaEjecutarSPTabla("SP_ConfigLeer");
                this.config = JsonSerializer.Deserialize<Configuracion>(tabla.Rows[0]["datosConfig"].ToString());
                this.configVisible = config;
                string IPAddress = "";

                IPHostEntry Host = default(IPHostEntry);
                string Hostname = null;
                Hostname = System.Environment.MachineName;
                Host = Dns.GetHostEntry(Hostname);
                foreach (IPAddress IP in Host.AddressList)
                {
                    if (IP.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                    {
                        IPAddress = Convert.ToString(IP);
                    }
                }

                this.configVisible.ipPropia = IPAddress;
            }
            catch (Exception ex)
            {

                throw new Exception($"{MethodBase.GetCurrentMethod().Name}: {ex.Message}");
            }


        }
        public List<Cola> listarColas()
        {

            return this.config.Colas;
        }

        public Pantalla detallePantalla(string ip)
        {
            return this.configVisible.Pantallas.Where(pantalla => pantalla.ip == ip).FirstOrDefault();
        }

        public Cola detalleCola(string nombre)
        {
            return this.configVisible.Colas.Where(cola => cola.nombre == nombre).First();
        }

        public List<string> listarCanales(string nombreCola)
        {
            return this.config.Colas.Where(cola => cola.nombre == nombreCola).First().canales;
        }

        public List<Pantalla> listarPantallas()
        {

            return this.config.Pantallas;
        }

        public List<Pantalla> listarPantallasActivas()
        {
            return this.config.Pantallas.Where(pantalla => pantalla.activa == true).ToList();
        }

        public Pantalla Estado(string nombre)
        {
            return this.config.Pantallas.Where(pantalla => pantalla.nombre == nombre).FirstOrDefault();
        }

        public List<Pantalla> listarPantallasActivas(string cola)
        {
            return this.config.Pantallas.Where(pantalla => pantalla.activa == true && pantalla.cola == cola).ToList();
        }

        public List<Pantalla> listarPantallas(string nombreCola)
        {

            return this.config.Pantallas.Where(pantalla => pantalla.cola == nombreCola).ToList();
        }

        public string listarModo(string nombreCola)
        {
            return this.config.Colas.Where(cola => cola.nombre == nombreCola).First().distribucion;
        }

        public string colaAsignada(string pantallaNombre)
        {
            return this.config.Pantallas.Where(pantalla => pantalla.nombre == pantallaNombre).First().cola;
        }

        public string listarConfig(string pantallaNombre)
        {
            return this.config.Pantallas.Where(pantalla => pantalla.nombre == pantallaNombre).First().propiedades;
        }

        public Pantalla BuscarPantallaEspejo(string ipPantallla)
        {
            Pantalla unaPantalla = this.config.PantallasEspejo.Where(pantalla => pantalla.ip == ipPantallla).FirstOrDefault();

            return unaPantalla;
        }

        public string configuracionPantalla(string ip)
        {
            //Obtengo las propiedades
            //Reemplazo el nombre de la pantalla interna screenName por la externa "nombre"
            Pantalla resultado = ((Pantalla)this.config.Pantallas.Where(pantalla => pantalla.ip == ip).FirstOrDefault());
            if (resultado != null)
            {
                resultado.propiedades = resultado.propiedades.Replace("----", ((Pantalla)this.config.Pantallas.Where(pantalla => pantalla.ip == ip).FirstOrDefault()).nombre).Replace("'", "\"");
                return resultado.propiedades;
            }

            return "";
        }

        public void MostrarDatos()
        {
            foreach (Cola item in this.configVisible.Colas)
            {
                Console.WriteLine($"Cola: {item.nombre}");

                Console.WriteLine("Pantallas asignadas: ");
                foreach (Pantalla itemPantalla in this.configVisible.Pantallas.Where(p => p.cola == item.nombre))
                {
                    Console.WriteLine($"{itemPantalla.nombre}");
                }

            }
        }

        public string ImprimirPorTCP()
        {
            return this.configVisible.Comandas.imprimirMedio;
        }

        /// <summary>
        /// Si es una pantalla espejo, retorno la pantalla que refleja, caso contrario, devuelve la misma IP
        /// </summary>
        /// <param name="ip"></param>
        public string EsPantallaEspejo(string ip)
        {
            Pantalla unaPantalla = this.BuscarPantallaEspejo(ip);

            if (unaPantalla != null)
                return unaPantalla.reflejoDeIP;
            else
                return ip;

        }
    }


}
