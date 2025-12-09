using System.Data;

namespace KDS.Interfaces
{
    public interface IConector
    {
        public void sesionConexion(string conexionIP, string conexionUser, string conexionPass, string conexionCATALOG);
        public int sesionAbrir(bool mensaje);
        public int sesionCerrar();

        public void consultaDatos(string nombre, System.Data.SqlDbType tipo, string contenido);
        public int consultaModificar(string query);

        public DataTable consultaResultados();

        public int consultaEjecutarSP(string SP_Nombre);

        public DataTable consultaEjecutarSPTabla(string SP_Nombre);

        public int consultaEjecutarSPEscalar(string SP_Nombre);

        public void consultaEjecutarSPSinResultados(string SP_Nombre);

        public int ConsultaEjecutarQueryEscalarEntero();

        public string ConsultaEjecutarQueryEscalarCadena();
    }
}
