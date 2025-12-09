using KDS.Modulos;
using System.Diagnostics;

namespace KDS.Entidades
{
    public class Generales
    {
        public int tiempoVida { get; set; }
        public int lecturaComandas { get; set; }
        public int? diasRetencionLog { get; set; }
        public bool comandaYcounters { get; set; }
        public bool cuentaProductos { get; set; }
        public bool ingresoPorBase { get; set; }
    }
    public class Comandas
    {
        public string imprimirMedio { get; set; }
        public int? tiempoComandasVivas { get; set; }
        public string? teclaBorradoComandas { get; set; }
        public int reintentosBase { get; set; }
        public string impresoraNombre { get; set; }
        public string impresoraIP { get; set; }
        public int impresoraPuerto { get; set; }
        public bool imprimirSinPantallasActivas { get; set; }
        public int columnasDetalles { get; set; }
        public string fuenteDetalles { get; set; }
    }

    public class ConexionKDS
    {
        public string? ip { get; set; }
        public string? usuario { get; set; }
        public string? clave { get; set; }
        public string? catalogo { get; set; }
    }

    public class ConexionNats
    {
        public string Url { get; set; }
        public string Tema { get; set; }
    }

    public class ConexionMXP
    {
        public string? ip { get; set; }
        public string? usuario { get; set; }
        public string? clave { get; set; }
        public string? catalogo { get; set; }
        public string? apiImpresion { get; set; }
    }

    public class Cola
    {
        public string? nombre { get; set; }
        public string? distribucion { get; set; }
        public List<string>? canales { get; set; }
        public List<string>? filtros { get; set; }
    }

    public class Filtro
    {
        public string? cadena { get; set; }
        public bool suprime { get; set; }
    }

    public class Pantalla
    {
        public string? nombre { get; set; }
        public string? ip { get; set; }
        public string? cola { get; set; }
        public string? propiedades { get; set; }
        public string? imprime { get; set; }
        public string? impresoraNombre { get; set; }
        public string? impresoraMarca { get; set; }
        public string? impresoraIP { get; set; }
        public int impresoraPuerto { get; set; }
        public List<Filtro>? filtros { get; set; }
        public List<ContadorConfig>? contar { get; set; }

        //Si la pantalla está activa => ScreenChecker actualiza
        public bool activa { get; set; }

        //La cantidad de comandas actuales
        public int cantidad { get; set; }

        //Tiempo de última indicación de "Activa"
        public DateTime tiempoActiva { get; set; }
        //si es una copia de pantalla tiene una IP de quien refleja
        public string? reflejoDeIP { get; set; }

    }

    public class ContadorConfig
    {
        public string producto { get; set; }
        public string etiqueta { get; set; }
    }

    public class Configuracion
    {
        public Generales? Generales { get; set; }
        public ConexionMXP? ConexionMXP { get; set; }
        public ConexionKDS? ConexionKDS { get; set; }
        public ConexionNats ConexionNATS { get; set; }
        public List<Pantalla>? Pantallas { get; set; }

        public List<Cola>? Colas { get; set; }
        public Comandas? Comandas { get; set; }

        public string? ipPropia { get; set; }

        public List<Pantalla>? PantallasEspejo { get; set; } = new List<Pantalla>();
    }

}
