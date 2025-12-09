using KDS.Entidades;
using KDS.Interfaces;
using KDS.Repositorios;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics.Eventing.Reader;
using System.Linq;
using System.Net.Mime;
using System.Reflection;
using System.Text.Json;

namespace KDS.Modulos
{
    public class ScreenManager
    {
        /// <summary>
        /// Listar comandas asignadas a una pantalla.
        /// </summary>
        /// <param name="ipPantalla">IP de la pantalla.</param>
        /// <returns></returns>
        public string MostrarComandas(string ipPantalla)
        {
            Console.WriteLine($"INFO: Iniciando Mostrar comandas {ipPantalla}");
            try
            {
                Pantalla pantalla = ConfigMaker.Instance.detallePantalla(ipPantalla);

                if (pantalla == null)
                {
                    Console.WriteLine($"INFO: No hay pantalla asignada a la ip {ipPantalla}");
                    return null;
                }

                //Retorno la tabla de resultados
                List<tComanda> listaResultados =  bdKDS2.Instance.ObtenerComandas(pantalla.cola, pantalla.nombre);

                if(listaResultados.Count == 0)
                {
                    Console.WriteLine($"INFO: No hay comandas asignadas a la ip {pantalla.ip}");
                    ScreenChecker.Instance.Activar(ipPantalla);
                    return null;
                }

                //Estructuro en un string para que viaje apropiadamente a la pantalla
                List<string> comandasSeparadas = new List<string>();
                int i = 0;
                Contador listaContados = null;
                //Si voy a contar, armo la estructura que después se va a enviar como json
                if (ConfigMaker.Instance.configVisible.Generales.cuentaProductos)
                {
                    if (pantalla.contar!= null && pantalla.contar.Count > 0)
                        listaContados = this.GenerarEstructuraContador(pantalla.contar);
                }

                //reviso cada comanda
                foreach(tComanda unaComanda in listaResultados)
                {
                    i++;
                    string comanda = this.AplicarFiltro(unaComanda.datosComanda, pantalla.filtros);
                    if (comanda.Length > 0)
                        comandasSeparadas.Add(comanda);


                    //si voy a contar producto, actualizo el contador
                    if (ConfigMaker.Instance.configVisible.Generales.cuentaProductos)
                    {
                        if (pantalla.contar != null && pantalla.contar.Count > 0)
                        {
                            List<string> textosContar = pantalla.contar.Select(x => x.producto).ToList();
                            ContarProductos(comanda, textosContar, listaContados);
                        }

                    }
                }

                string listaComandas = "[" + String.Join(",", comandasSeparadas) + "]";

                Console.WriteLine($"INFO: Devolviendo comandas a la IP {ipPantalla} - Cantidad: {i}");
                LogProcesos.Instance.Escribir($"INFO: Devolviendo comandas a la IP {ipPantalla} - Cantidad: {i}");

                if (ConfigMaker.Instance.configVisible.Generales.comandaYcounters)
                {
                    if (ConfigMaker.Instance.configVisible.Generales.cuentaProductos)
                    {
                        if (pantalla.contar != null && pantalla.contar.Count > 0)
                        {
                            listaContados.counters.ForEach(x => x.name = x.etiqueta);
                            string counters = JsonSerializer.Serialize(listaContados);
                            listaComandas = "{ \"comandas\": " + listaComandas + ", " + counters.Substring(1, counters.Length - 2) + "}";
                        }
                        else
                            listaComandas = "{ \"comandas\": " + listaComandas + ", \"counters\":[]}";
                    }
                    else
                    {
                        listaComandas = "{ \"comandas\": " + listaComandas + ", \"counters\":[]}";
                    }

                }


                //-------------------------------------------------

                //Registro tiempo de vida de pantalla

                ScreenChecker.Instance.Activar(ipPantalla);

                Console.WriteLine($"INFO: Registrando Tiempo de Vida {ipPantalla}");
                //--------------------------------------------------
                return listaComandas;

            }
            catch (Exception ex)
            {
                LogProcesos.Instance.Escribir($"ERROR: {ex.Message}");
                Console.WriteLine(ex.Message);
                return null;
            }

        }

        /// <summary>
        /// Dada una pantalla, retorna las comandas de esa pantalla
        /// </summary>
        /// <param name="pantalla"></param>
        /// <returns></returns>
        public DataTable ObtenerComandas(Pantalla pantalla)
        {
            // Busco comandas a la IP asignada
            ConexionKDS conexionBaseKDS = ConfigMaker.Instance.configVisible.ConexionKDS;
            IConector conector = new ConectorSQL();
            conector.sesionConexion(conexionBaseKDS.ip, conexionBaseKDS.usuario,
                conexionBaseKDS.clave, conexionBaseKDS.catalogo);
            conector.consultaDatos("cola", System.Data.SqlDbType.VarChar, pantalla.cola);
            conector.consultaDatos("pantalla", System.Data.SqlDbType.VarChar, pantalla.nombre);
            DataTable resultados = conector.consultaEjecutarSPTabla("SP_DistribucionListarComandas");
            return resultados;

        }

        /// <summary>
        /// Dado un listado de comandos, actuar.
        /// </summary>
        /// <param name="comandos">Lista de comandos.</param>
        /// <param name="ip">IP de la pantalla.</param>
        public void ActualizarComanda(List<string> comandos, string ip)
        {
            try
            {
                //Como es de una única pantalla, busco la información pertinente
                Pantalla unaPantalla = ConfigMaker.Instance.detallePantalla(ip);
                string imprimirMedio = ConfigMaker.Instance.ImprimirPorTCP();

                foreach (string item in comandos)
                {
                    string eleccion = item;
                    //Si el comando ingresado es un hash, debe tener más de 10 caracteres, entonces voy al case de impresión
                    if (item.Length > 20)
                        eleccion = "IMPRIMIR";


                    switch (eleccion)
                    {
                        case "UNDO":
                            Console.WriteLine($"UNDO - {ip}");
                            LogProcesos.Instance.Escribir($"UNDO: {ip}");
                            this.Deshacer(item, unaPantalla.cola, unaPantalla.nombre);
                            break;

                        case "OFF":
                            Console.WriteLine($"OFF - {ip}");
                            LogProcesos.Instance.Escribir($"OFF: {ip}");
                            ScreenChecker.Instance.DesactivarPantalla(ip);
                            //Llamar para rebalancear los que le pertenecían.
                            break;

                        case "ON":
                            Console.WriteLine($"ON - {ip}");
                            LogProcesos.Instance.Escribir($"ON: {ip}");
                            //Llamo para activar la pantalla
                            ScreenChecker.Instance.Activar(ip);

                            //Redistribuir comandas en todas las pantallas activas de la cola
                            LogProcesos.Instance.Escribir($"ON: {ip} - Rebalanceando comandas");
                            ScreenChecker.Instance.RebalancearComandasPorPantalla(ip);
                            break;

                        case "IMPRIMIR":
                            Console.WriteLine($"Imprimir comanda: {item}");
                            LogProcesos.Instance.Escribir($"Imprimir comanda: {item}");
                            this.ImprimirComanda(item, unaPantalla.cola, unaPantalla.nombre, unaPantalla.imprime,
                                unaPantalla.impresoraNombre, unaPantalla.impresoraIP, unaPantalla.impresoraPuerto, imprimirMedio, unaPantalla.impresoraMarca);
                            break;

                        //para borrar de las pantallas todas las comandas
                        case string elemento when ConfigMaker.Instance.configVisible.Comandas.teclaBorradoComandas == elemento:
                            Console.WriteLine($"Borrando todas las comandas.");
                            LogProcesos.Instance.Escribir($"Borrando todas las comandas.");
                            this.AnularTodasComandas();
                            break;

                        default:
                            Console.WriteLine($"Comando no reconocido: {eleccion}");
                            LogProcesos.Instance.Escribir($"Comando no reconocido: {eleccion}");
                            break;


                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{MethodBase.GetCurrentMethod().Name}: {ex.Message} ");
                LogProcesos.Instance.Escribir($"{MethodBase.GetCurrentMethod().Name}: {ex.Message} ");
            }


        }

        /// <summary>
        /// Revive la última comanda cerrada de una pantalla.
        /// </summary>
        /// <param name="idComanda">Id de comanda.</param>
        /// <param name="nombreCola">Nombre de la cola.</param>
        /// <param name="nombrePantalla">Nombre de la pantalla.</param>
        /// <exception cref="Exception"></exception>
        private void Deshacer(string idComanda, string nombreCola, string nombrePantalla)
        {
            try
            {
                ConexionKDS conexionBaseKDS = ConfigMaker.Instance.configVisible.ConexionKDS;
                IConector conector = new ConectorSQL();
                conector.sesionConexion(conexionBaseKDS.ip, conexionBaseKDS.usuario,
                    conexionBaseKDS.clave, conexionBaseKDS.catalogo);
                //Cuando grabo en la base, utilizo el nombre de la pantallaSeleccionada
                conector.consultaDatos("cola", System.Data.SqlDbType.VarChar, nombreCola);
                conector.consultaDatos("pantalla", System.Data.SqlDbType.VarChar, nombrePantalla);
                DataTable tabla = conector.consultaEjecutarSPTabla("SP_DistribucionDeshacer");
                bdKDS2.Instance.SP_DistribucionDeshacer(tabla.Rows[0]["idOrden"].ToString(), tabla.Rows[0]["datosComanda"].ToString(), tabla.Rows[0]["fechaCreacion"].ToString(), Convert.ToDateTime(tabla.Rows[0]["fechaIngreso"].ToString()),
                    tabla.Rows[0]["idEstadoComanda"].ToString(), Convert.ToInt32(tabla.Rows[0]["Reimpresion"].ToString()), tabla.Rows[0]["Cola"].ToString(), tabla.Rows[0]["Pantalla"].ToString(), tabla.Rows[0]["IdEstadoDistribucion"].ToString(),
                    Convert.ToDateTime(tabla.Rows[0]["fechaModificacion"].ToString()));


            }
            catch (Exception ex)
            {

                throw new Exception($"{MethodBase.GetCurrentMethod().Name}: {ex.Message} ");
            }

        }

        /// <summary>
        /// Borrar todas las comandas de las pantallas
        /// </summary>
        /// <exception cref="Exception"></exception>
        public void AnularTodasComandas()
        {
            try
            {
                ConexionKDS conexionBaseKDS = ConfigMaker.Instance.configVisible.ConexionKDS;
                IConector conector = new ConectorSQL();
                conector.sesionConexion(conexionBaseKDS.ip, conexionBaseKDS.usuario,
                    conexionBaseKDS.clave, conexionBaseKDS.catalogo);
                conector.consultaEjecutarSP("SP_AnularComandasForzado");
                return;
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }
        }

        /// <summary>
        /// Imprimir una comanda
        /// </summary>
        /// <param name="idComanda">Id de orden.</param>
        /// <param name="nombreCola">Nombre de cola.</param>
        /// <param name="nombrePantalla">Nombre de pantalla.</param>
        /// <param name="imprime">Si la pantalla imprime o no.</param>
        /// <param name="nombreImpresora">Nombre de la impresora.</param>
        /// <param name="ipImpresora">IP de la impresora.</param>
        /// <exception cref="Exception"></exception>
        private void ImprimirComanda(string idComanda, string nombreCola, string nombrePantalla,  string imprime, string? nombreImpresora, string? ipImpresora, int puertoImpresora, string imprimirMedio, string impresoraMarca)
        {
            try
            {

                ConexionKDS conexionBaseKDS = ConfigMaker.Instance.configVisible.ConexionKDS;
                IConector conector = new ConectorSQL();
                conector.sesionConexion(conexionBaseKDS.ip, conexionBaseKDS.usuario,
                    conexionBaseKDS.clave, conexionBaseKDS.catalogo);
                //Cuando grabo en la base, utilizo el nombre de la pantallaSeleccionada
                conector.consultaDatos("idOrden", System.Data.SqlDbType.VarChar, idComanda);
                conector.consultaDatos("cola", System.Data.SqlDbType.VarChar, nombreCola);
                conector.consultaDatos("pantalla", System.Data.SqlDbType.VarChar, nombrePantalla);
                conector.consultaDatos("imprime", System.Data.SqlDbType.VarChar, imprime);
                conector.consultaEjecutarSP("SP_DistribucionImprimir");

                LogProcesos.Instance.Escribir($"INFO: En imprimir detalle - {idComanda}");
                tComanda? comandaResultado = bdKDS2.Instance.SP_ComandaLeer(idComanda);

                if (comandaResultado == null)
                {
                    LogProcesos.Instance.Escribir($"INFO: Comanda no encontrada - {idComanda}");
                    return;
                }
                Comanda? unaComanda = JsonSerializer.Deserialize<Comanda>(comandaResultado.datosComanda);

                bdKDS2.Instance.SP_DistribucionImprimir(idComanda, nombreCola, nombrePantalla);
                Impresion impresion = new Impresion();
                if (imprime == "SI")
                {
                    switch (imprimirMedio)
                    {
                        case "JAR":
                                 LogProcesos.Instance.Escribir($"INFO: Imprime MXP - {idComanda}");
                        impresion.ImprimirComanda(idComanda, nombreImpresora, ipImpresora);
                                break;
                        case "NETCORE":
                            //Imprimir por NetCore
                            impresion.imprimirComandaNetCore(unaComanda.otrosDatos.nroCheque, unaComanda.impresion, ipImpresora, puertoImpresora);
                            break;
                        default:

                                LogProcesos.Instance.Escribir($"INFO: Imprime TCP - {ipImpresora}:{puertoImpresora} - {idComanda}");
                                Thread ordenImpresion = new Thread(() => {
                                    impresion.ImprimirComandaDetalle(comandaResultado, unaComanda, ipImpresora, puertoImpresora, ConfigMaker.Instance.configVisible.Comandas.columnasDetalles, ConfigMaker.Instance.configVisible.Comandas.fuenteDetalles);
                                });

                                ordenImpresion.Start();
                            break;
                    }


                }
                else
                {
                    LogProcesos.Instance.Escribir($"INFO: {idComanda} no se imprime por configuración de pantalla");

                }


            }
            catch (Exception ex)
            {
                LogProcesos.Instance.Escribir($"{MethodBase.GetCurrentMethod().Name}: {ex.Message} ");
                throw new Exception($"{MethodBase.GetCurrentMethod().Name}: {ex.Message} ");

            }
        }

        /// <summary>
        /// Aplica los filtros a las descripciones de los productos dejando cadena vacía si ninguno de los filtros es aplicable a esa descripción.
        /// </summary>
        /// <param name="comanda">Comanda.</param>
        /// <param name="filtros">Lista de filtros.</param>
        /// <returns></returns>
        public string AplicarFiltro(string comanda, List<Filtro> listaFiltros)
        {
            if (listaFiltros == null)
                return comanda;

            Comanda? unaComanda = JsonSerializer.Deserialize<Comanda>(comanda);
            int b = 0;
            bool sinBorrar = false;

            //Recorro la lista principal de productos
            if (listaFiltros.Count > 0)
            for (int i = 0; i < unaComanda.products.Count; i++)
            {
                //Pregunto para cada filtro si está en el nombre. SI lo está, NO limpio la cadena.
                b = 1;
                foreach (Filtro unFiltro in listaFiltros)
                {
                    if (unaComanda.products[i].name != null)
                        if (unaComanda.products[i].name.ToUpper().Contains(unFiltro.cadena.ToUpper()))
                        {
                            b = 0;
                                //remmplazo el caracter si corresponde
                                if (unFiltro.suprime)
                                    unaComanda.products[i].name = unaComanda.products[i].name.Replace(unFiltro.cadena, "");
                        }

                }
                if (b == 1)
                    unaComanda.products[i].name = "";

                //Pregunto para cada filtro si está en contenidoKDS. SI lo está, limpio la cadena.

                if (unaComanda.products[i].content != null)
                    for (int iContenido = 0; iContenido < unaComanda.products[i].content.Count; iContenido++)
                    {
                        b = 1;
                        foreach (Filtro unFiltro in listaFiltros)
                        {
                            if (unaComanda.products[i].content[iContenido].ToUpper().Contains(unFiltro.cadena.ToUpper()))
                            {
                                b = 0;
                                //remmplazo el caracter si corresponde
                                if (unFiltro.suprime)
                                        unaComanda.products[i].content[iContenido] = unaComanda.products[i].content[iContenido].Replace(unFiltro.cadena, "");
                            }
                        }

                        if (b == 1)
                            unaComanda.products[i].content[iContenido] = "";
                        b = 0;

                    }

                //Para cada sublista de producto hago el mismo análisis.
                for (int j = 0; j < unaComanda.products[i].products.Count; j++)
                {
                    b = 1;
                    //La descripción del producto
                    foreach (Filtro unFiltro in listaFiltros)
                    {
                        if (unaComanda.products[i].products[j].name != null)
                            if (unaComanda.products[i].products[j].name.ToUpper().Contains(unFiltro.cadena.ToUpper()))
                            {
                                b = 0;
                                //remmplazo el caracter si corresponde
                                if (unFiltro.suprime)
                                        unaComanda.products[i].products[j].name = unaComanda.products[i].products[j].name.Replace(unFiltro.cadena, "");
                            }
                        }

                    if (b == 1)
                        unaComanda.products[i].products[j].name = "";


                }

            }

            foreach (Product item in unaComanda.products)
            {
                if (item.name != "")
                    sinBorrar = true;

                if (item.content.Any(x => x != ""))
                    sinBorrar = true;

                foreach (Product2 subtiem in item.products)
                {
                    if (subtiem.name != "")
                        sinBorrar = true;

                }
            }

            if (sinBorrar)
                return JsonSerializer.Serialize(unaComanda);
            else
                return "";

        }

        public void ContarProductos(string comanda, List<string>? listaContar, Contador listaContados)
        {
            if (listaContar == null)
                return;

            Comanda? unaComanda = JsonSerializer.Deserialize<Comanda>(comanda);

            //Recorro la lista principal de productos
            if (listaContar.Count > 0)
                for (int i = 0; i < unaComanda.products.Count; i++)
                {
                    //Pregunto para cada filtro si está en el nombre. SI lo está, NO limpio la cadena.
                    foreach (string unFiltro in listaContar)
                    {
                        if (unaComanda.products[i].name != null)
                            if (unaComanda.products[i].name.ToUpper().Contains(unFiltro.ToUpper()))
                            {
                                SumarContado(listaContados, unFiltro, unaComanda.products[i].amount);
                            }

                    }


                    //Pregunto para cada filtro si está en contenidoKDS. SI lo está, limpio la cadena.

                    if (unaComanda.products[i].content != null)
                        for (int iContenido = 0; iContenido < unaComanda.products[i].content.Count; iContenido++)
                        {

                            foreach (string unFiltro in listaContar)
                            {
                                if (unaComanda.products[i].content[iContenido].ToUpper().Contains(unFiltro.ToUpper()))
                                {
                                    SumarContado(listaContados, unFiltro, Convert.ToInt32(unaComanda.products[i].content[iContenido].ToUpper().Split('X')[0]));

                                }
                            }

                        }

                    //Para cada sublista de producto hago el mismo análisis.
                    for (int j = 0; j < unaComanda.products[i].products.Count; j++)
                    {
                        //La descripción del producto
                        foreach (string unFiltro in listaContar)
                        {
                            if (unaComanda.products[i].products[j].name != null)
                                if (unaComanda.products[i].products[j].name.ToUpper().Contains(unFiltro.ToUpper()))
                                {
                                    SumarContado(listaContados, unFiltro, unaComanda.products[i].products[j].amount);
                                }
                        }

                        if (unaComanda.products[i].products[j].content != null)
                        for (int iContenido = 0; iContenido < unaComanda.products[i].products[j].content.Count; iContenido++)
                        {
                            foreach (string unFiltro in listaContar)
                            {
                                if (unaComanda.products[i].products[j].content[iContenido].ToUpper().Contains(unFiltro.ToUpper()))
                                {
                                    SumarContado(listaContados, unFiltro, Convert.ToInt32(unaComanda.products[i].products[j].content[iContenido].ToUpper().Split('X')[0]));

                                }
                            }
                        }

                    }

                }

                return ;
        }

        private Contador GenerarEstructuraContador(List<ContadorConfig> contar)
        {
            Contador listaContadores = new Contador();
            listaContadores.counters = new List<ProductoContar>();
            foreach (ContadorConfig contenido in contar)
            {
                listaContadores.counters.Add(new ProductoContar() { name = contenido.producto, amount = 0, etiqueta = contenido.etiqueta  });
            }

            return listaContadores;
        }


        private void SumarContado(Contador listaContados, string filtro, int? cantidad)
        {
            for (int i = 0; i < listaContados.counters.Count; i++)
            {
                if (listaContados.counters[i].name == filtro)
                    listaContados.counters[i].amount += cantidad;
            }
        }
    }
}
