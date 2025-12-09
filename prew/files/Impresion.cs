using KDS.Entidades;
using KDS.Interfaces;
using KDS.Repositorios;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.Options;
using Microsoft.VisualBasic;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Diagnostics.Eventing.Reader;
using System.Drawing;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Text.Unicode;
using System.Xml.Linq;
using static System.Net.Mime.MediaTypeNames;

namespace KDS.Modulos
{
     enum Tipografias {Fuente0, NegritaOn, NegritaOFF, CursivaON, CursivaOFF, SubrayadoON, SubrayadoOFF, Fuente1, Fuente2, Fuente3, Fuente4 }
    public class Impresion
    {
        static HttpClient client = new HttpClient();
        int cantCharsFuente2 = 24;
        /// <summary>
        /// Enviar a imprimir una comanda.
        /// </summary>
        /// <param name="idComanda">Id de orden</param>
        /// <param name="nombreImpresora">Nombre de la impresora en Windows</param>
        /// <param name="ipImpresora">IP del equipo de Windows dond está instalada esa impresora</param>
        /// <returns></returns>
        /// <exception cref="Exception"></exception>
        public int ImprimirComanda(string idComanda, string nombreImpresora, string ipImpresora)
        {

            LogProcesos.Instance.Escribir($"INFO: Actualizando en MXP: {idComanda}.");
            ConexionMXP conexionBaseMXP = ConfigMaker.Instance.configVisible.ConexionMXP;
            int
                reintentosBase = ConfigMaker.Instance.configVisible.Comandas.reintentosBase;
            int reintentos = 1;
            bool correcto = false;
            //Registra en la base de datos
            //Utilizando el idComanda y el Nombre
            IConector conector = new ConectorSQL();
            conector.sesionConexion(conexionBaseMXP.ip, conexionBaseMXP.usuario,
                conexionBaseMXP.clave, conexionBaseMXP.catalogo);

            conector.consultaDatos("ordenId", System.Data.SqlDbType.VarChar, idComanda);
            conector.consultaDatos("nombreImpresora", System.Data.SqlDbType.VarChar, nombreImpresora);
            conector.consultaDatos("ipImpresora", System.Data.SqlDbType.VarChar, ipImpresora);

            //While con try/catch, con contador de reintentos
            //SE QUE HAY REDUNDANCIA DE CONTROLES, PERO POR LAS DUDAS...
            while (reintentos <= reintentosBase && correcto == false)
            {
                try
                {
                    ((ConectorSQL)conector).query = @"UPDATE Detalle_Orden_Pedido SET dop_impresion = -1, dop_estado = 1
                                            from Detalle_Orden_Pedido
                                            inner join Canal_Movimiento on Canal_Movimiento.imp_varchar3 = cast(Detalle_Orden_Pedido.IdCabeceraOrdenPedido as varchar(50))
                                            where Detalle_Orden_Pedido.IDCabeceraOrdenPedido = @ordenId
                                            and Canal_Movimiento.imp_url like '%guardaOrden=1%'"
            ;
                    conector.consultaResultados();
                    LogProcesos.Instance.Escribir($"INFO: Comanda {idComanda} se actualizó Detalle_orden_pedido.");
                    correcto = true;
                    reintentos = 100;
                }
                catch (Exception ex)
                {
                    LogProcesos.Instance.Escribir($"ERROR: Comanda {idComanda} no se pudo actualizar Detall_orden_pedido. Intento {reintentos}. {ex.Message}");
                    correcto = false;
                    reintentos++;
                }
            }

            reintentos = 1;
            correcto = false;

            conector.consultaDatos("ordenId", System.Data.SqlDbType.VarChar, idComanda);
            conector.consultaDatos("nombreImpresora", System.Data.SqlDbType.VarChar, nombreImpresora);
            conector.consultaDatos("ipImpresora", System.Data.SqlDbType.VarChar, ipImpresora);

            while (reintentos <= reintentosBase && correcto == false)
            {
                try
                {
                    ((ConectorSQL)conector).query = @"UPDATE Canal_Movimiento SET imp_impresora = @nombreImpresora,
                                            imp_float1 = 51, imp_ip_estacion = @ipImpresora
                                            WHERE imp_varchar3 = @ordenId and imp_float1 in (52, 61)";
                    conector.consultaResultados();

                    LogProcesos.Instance.Escribir($"INFO: Comanda {idComanda} enviada a imprimir en {ipImpresora} - {nombreImpresora}.");
                    correcto = true;
                    reintentos = 100;

                }
                catch (Exception ex)
                {
                    LogProcesos.Instance.Escribir($"ERROR: Comanda {idComanda} no se pudo enviar a imprimir en Canal_movimiento. Intento {reintentos}. {ex.Message}");
                    correcto = false;
                    reintentos++;
                }
            }


            return 1;


        }

        //select imp_varchar3 from Canal_Movimiento where imp_float1 = 60

        //select* from Canal_Movimiento where imp_float1 = 60


        public void ImprimirComandaDetalle(tComanda? comandaResultado, Comanda? unaComanda, string ipImpresora, int puerto, int columnasDetalles, string fuenteDetalles, bool sinPantalla = false, string colaSinPantalla = "")
        {

            try
            {
                /*********************LÍNEA HORIZONTAL ****************************************/
                byte[] lineaHorizontal;
                Tipografias tipografia = fuenteDetalles.ToUpper() == "GRANDE" ? Tipografias.Fuente2 : Tipografias.Fuente0;
                lineaHorizontal = CodigosFormato(tipografia).Concat(ConvertirEnRenglones("---------------------------------------------------------------------".Substring(0,columnasDetalles))).ToArray();
                /*********************LÍNEA HORIZONTAL  ****************************************/
                byte[] enter5 = StringToByteArray("1b6405"); //ENTER
                byte[] enter1 = StringToByteArray("1b6401");
                byte[] enter = StringToByteArray("1b6400");
                byte[] centrar = StringToByteArray("1B6149"); //CENTRAR
                byte[] izquierda = StringToByteArray("1B6148"); //IZQUIERDA
                string textoUnico = "";
                string[] separaciones = new string[2];


                IConector conector = new ConectorSQL();

                /*********************IMPRESION ****************************************/
                Socket miSocket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
                IPEndPoint miDireccion = new IPEndPoint(IPAddress.Parse(ipImpresora), puerto);
                miSocket.Connect(miDireccion); // Conectamos
                /*********************IMPRESION ****************************************/


                byte[] textoReimpresion ;
                if (sinPantalla)
                {
                    textoReimpresion = CodigosFormato(Tipografias.Fuente0).Concat(centrar).Concat(ConvertirEnRenglones($"COLA SIN PANTALLAS ACTIVAS: {colaSinPantalla}")).Concat(izquierda).ToArray();
                    _ = miSocket.Send(textoReimpresion, SocketFlags.None);

                }


                if (comandaResultado.Reimpresion != 0)
                {
                    textoReimpresion = CodigosFormato(Tipografias.Fuente0).Concat(centrar).Concat(ConvertirEnRenglones($"Reimpresion: {comandaResultado.Reimpresion}")).Concat(izquierda).ToArray();
                    _ = miSocket.Send(textoReimpresion, SocketFlags.None);

                }
                _ = miSocket.Send(enter1, SocketFlags.None);
                byte[][] titulo = new byte[2][];

                //Canal
                titulo[0] = CodigosFormato(Tipografias.Fuente3).Concat(ConvertirEnRenglonesSinEnter("CANAL: ")).Concat(CodigosFormato(Tipografias.Fuente1)).Concat(ConvertirEnRenglones($"{unaComanda.channel.name}-{unaComanda.channel.type}")).ToArray();
                //titulo[0] = CodigosFormato(Tipografias.Fuente3).Concat(ConvertirEnRenglonesSinEnter("CANAL: ")).Concat(CodigosFormato(Tipografias.Fuente1)).Concat(ConvertirEnRenglones($"DELIVERY-CALLCENTER")).ToArray();
                //Número de turno
                if (unaComanda.otrosDatos != null)
                {
                    if (unaComanda.otrosDatos.turno != -1)
                        titulo[1] = CodigosFormato(Tipografias.Fuente3).Concat(ConvertirEnRenglonesSinEnter("TURNO: ")).Concat(CodigosFormato(Tipografias.Fuente1)).Concat(ConvertirEnRenglones($"{unaComanda.otrosDatos.turno.ToString()}-{unaComanda.otrosDatos.llamarPor}")).Concat(CodigosFormato(Tipografias.NegritaOFF)).ToArray();
                    else
                        titulo[1] = CodigosFormato(Tipografias.Fuente3).Concat(ConvertirEnRenglonesSinEnter("TRANSACCION: ")).Concat(CodigosFormato(Tipografias.Fuente1)).Concat(ConvertirEnRenglones($"{unaComanda.otrosDatos.nroCheque.Substring(12,2)}")).Concat(CodigosFormato(Tipografias.NegritaOFF)).ToArray();
                }


                /*********************IMPRESION CABECERA ****************************************/
                for (int i = 0; i < titulo.Length; i++)
                {
                    if (titulo[i].Length > 0)
                    _ = miSocket.Send(titulo[i], SocketFlags.None);
                }
                /*********************IMPRESION ****************************************/

                //Datos cajero y fecha
                byte[][] datosCheque = new byte[2][];
                datosCheque[0] = CodigosFormato(Tipografias.Fuente0).Concat(ConvertirEnRenglones($"CAJERO: {unaComanda.cashRegister.cashier}")).Concat(CodigosFormato(Tipografias.Fuente0)).ToArray();
                datosCheque[1] = CodigosFormato(Tipografias.Fuente0).Concat(ConvertirEnRenglones($"FECHA:  {unaComanda.otrosDatos.Fecha}")).Concat(CodigosFormato(Tipografias.Fuente0)).ToArray();
                for (int i = 0; i < datosCheque.Length; i++)
                {
                    if (datosCheque[i].Length > 0)
                        _ = miSocket.Send(datosCheque[i], SocketFlags.None);
                }

                //Direccion cliente si tiene info al inicio
                if (unaComanda.otrosDatos.Direccion != "")
                {
                    unaComanda.otrosDatos.Direccion = $"NOTA: {unaComanda.otrosDatos.Direccion}";
                    unaComanda.otrosDatos.Direccion = unaComanda.otrosDatos.Direccion.Length > 48 ? unaComanda.otrosDatos.Direccion.Substring(0, 48) : unaComanda.otrosDatos.Direccion;
                    byte[] direccion;
                    direccion = CodigosFormato(Tipografias.Fuente0).Concat(ConvertirEnRenglones(unaComanda.otrosDatos.Direccion)).ToArray();

                    _ = miSocket.Send(direccion, SocketFlags.None);

                }

                /********************* ENTER ****************************************/

                _ = miSocket.Send(lineaHorizontal, SocketFlags.None);

                /*********************IMPRESION ****************************************/
                //cantidad de líneas a imprimir
                byte[][] lineas = new byte[0][];
                foreach (Product item in unaComanda.products)
                {
                    Array.Resize(ref lineas, lineas.Count() + item.products.Count +1  + item.content.Count);
                    foreach (Product2 subItem in item.products)
                    {
                        if (subItem.content.Count > 0)
                        {
                            Array.Resize(ref lineas, lineas.Count() + subItem.content.Count);
                        }
                    }
                }

                int ipos = -1;
                foreach (Product item in unaComanda.products)
                {

                    //La cantidad de líeas a imprimir es cantidad de productos + cantidad de contenidoKDS de cada producto + contenidoKds de cada subproducto
                    //byte[][] lineas = new byte[item.products.Count + 1+item.content.Count][];
                    //byte[] mensaje = new byte[0];
                    //Concateno con cantidad para obtener una única cadena

                    /*PARA IMPRIMIR*/
                    string unificado = identarCantidadDescripción(item.amount, this.quitarTildes(item.name), 1);
                    separaciones = separarDescripcion(unificado, ref lineas, 3, columnasDetalles);
                    foreach (string textoParcial in separaciones)
                    {
                        if (textoParcial != "" )
                        {
                            ipos++;
                            lineas[ipos] = CodigosFormato(tipografia).Concat(CodigosFormato(Tipografias.NegritaOn)).Concat(ConvertirEnRenglones(textoParcial)).Concat(CodigosFormato(Tipografias.NegritaOFF)).ToArray();
                        }


                    }

                    /*FIN IMPRIMIR LÍNEA*/

                    /*imprimo contenido kds*/
                    if (item.content.Count > 0)
                        foreach(string conenidoKds in item.content)
                        {
                            unificado = IdentarContenidoKDS(this.quitarTildes(conenidoKds));
                            separaciones = separarDescripcion(unificado, ref lineas, 4, columnasDetalles);
                            foreach (string textoParcial in separaciones)
                            {
                                if (textoParcial != "")
                                {
                                    ipos++;
                                    lineas[ipos] = CodigosFormato(tipografia).Concat(ConvertirEnRenglones(textoParcial)).ToArray();
                                }

                            }

                        }


                    foreach (Product2 subItem in item.products)
                    {
                        if (subItem.content.Count > 0)
                        {
                            //Array.Resize(ref lineas, lineas.Count() + subItem.content.Count);
                            foreach (string conenidoKds in subItem.content)
                            {
                                unificado = IdentarContenidoKDS(this.quitarTildes(conenidoKds));
                                separaciones = separarDescripcion(unificado, ref lineas, 4, columnasDetalles);
                                foreach (string textoParcial in separaciones)
                                {

                                    if (textoParcial != "")
                                    {
                                        ipos++;
                                        lineas[ipos] = CodigosFormato(tipografia).Concat(ConvertirEnRenglones(textoParcial)).ToArray();
                                    }

                                }

                            }
                        }


                        unificado = identarCantidadDescripción(subItem.amount, this.quitarTildes(subItem.name), 2);
                        separaciones = separarDescripcion(unificado, ref lineas, 4, columnasDetalles);
                        foreach (string textoParcial in separaciones)
                        {
                            if (textoParcial!="")
                            {
                                ipos++;
                                lineas[ipos] = CodigosFormato(tipografia).Concat(ConvertirEnRenglones(textoParcial)).ToArray();
                            }

                        }



                    }

                }
                LogProcesos.Instance.Escribir($"Conectado con {ipImpresora} para imprimir {comandaResultado.IdOrden}");
                /*********************IMPRESION ****************************************/
                for (int i = 0; i < lineas.Length; i++)
                {
                    _ = miSocket.Send(lineas[i], SocketFlags.None);
                }
                /*********************IMPRESION ****************************************/


                _ = miSocket.Send(lineaHorizontal, SocketFlags.None);

                /*****************************QR**************************/

                _ = miSocket.Send(centrar, SocketFlags.None);
                string cheque = unaComanda.otrosDatos.nroCheque;
                int largo = cheque.Length + 3;
                string store_PL = (largo % 256).ToString("X").PadLeft(2, '0');
                string store_PH = (largo / 256).ToString("X").PadLeft(2, '0');
                byte[] qr = StringToByteArray($"1d286b03003143081d286b03003145301d286b{store_PL}{store_PH}315030{AsciiToHex(cheque)}1d286b0300315130");
                _ = miSocket.Send(qr, SocketFlags.None);

                /*********************************************************/
                _ = miSocket.Send(enter1, SocketFlags.None);
                byte[] chk = CodigosFormato(Tipografias.Fuente0).Concat(ConvertirEnRenglones(unaComanda.otrosDatos.nroCheque)).ToArray();
                _ = miSocket.Send(chk, SocketFlags.None);
                _ = miSocket.Send(enter5, SocketFlags.None);

                _ = miSocket.Send(izquierda, SocketFlags.None);
                /*************IMPRIMI LÍNEAS EN BLANCO Y CORTAR*/
                _ = miSocket.Send(enter, SocketFlags.None);
                byte[] cierre2 = StringToByteArray("1b6d00"); //CORTE DE PAPEL
                _ = miSocket.Send(cierre2, SocketFlags.None);

                miSocket.Close();
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al imprimir comanda por TCP/IP {comandaResultado.IdOrden} en {ipImpresora}: {ex.Message}");
            }


        }

        public async Task imprimirComandaNetCore(string nrocheque, string comanda, string ipImpresora, int puerto)
        {
            try
            {
                var cliente = new HttpClient();
                var url = $"http://{ipImpresora}:{puerto.ToString()}/api/ImpresionTickets/Impresion";
                var contenido = new StringContent(comanda, Encoding.UTF8, "application/json");

                var respuesta = await cliente.PostAsync(url, contenido);
                var cuerpoRespuesta = await respuesta.Content.ReadAsStringAsync();

                LogProcesos.Instance.Escribir($"INFO: Comanda {nrocheque} enviada a imprimir en {ipImpresora} - Código: {respuesta.StatusCode} - Respuesta: {cuerpoRespuesta}.");

            }
            catch (Exception ex)
            {
                throw new Exception($"Error al imprimir comanda por NetCore {nrocheque} en {ipImpresora}: {ex.Message}");
            }


        }

        public static string AsciiToHex(string asciiString)
        {
            StringBuilder builder = new StringBuilder();
            foreach (char c in asciiString)
            {
                builder.Append(Convert.ToInt32(c).ToString("X"));
            }
            return builder.ToString();
        }

        static byte[] CodigosFormato(Tipografias tipografias)
        {
            string codigo = "";
            switch (tipografias)
            {
                case Tipografias.NegritaOn:
                    codigo = "1B4501";
                    break;
                case Tipografias.NegritaOFF:
                    codigo = "1B4500";
                    break;
                case Tipografias.CursivaON:
                    codigo = "1B3401";
                    break;
                case Tipografias.CursivaOFF:
                    codigo = "1B3400";
                    break;
                case Tipografias.SubrayadoON:
                    codigo = "1B2D01";
                    break;
                case Tipografias.SubrayadoOFF:
                    codigo = "1B2D00";
                    break;
                case Tipografias.Fuente0:
                    codigo = "1D2100";
                    break;
                case Tipografias.Fuente1:
                    codigo = "1D2111";
                    break;
                case Tipografias.Fuente2:
                    codigo = "1D2110";
                    break;
                case Tipografias.Fuente3:
                    codigo = "1D2101";
                    break;
                default:
                    break;
            }

            return StringToByteArray(codigo);
        }

        /// <summary>
        /// Genera dos renglones cuando la cantidad y concatenada la descripción supera el valor de cantCharsFuente2
        /// </summary>
        /// <param name="cadena">Cadena que tiene cantidad + descripción.</param>
        /// <param name="lista">Le aplica el resize.</param>
        /// <param name="espacios">Cantidad de espacios al principio del segundo renglón.</param>
        /// <returns></returns>
        private string[] separarDescripcion (string cadena,ref byte[][] lista, int espacios, int columnasDetalles)
        {
            string auxCadena = cadena;
            string espaciado = "";
            int pos = 1;

            for (int i = 0; i < espacios; i++)
            {
                espaciado += " ";
            }

            int inicio = columnasDetalles * pos;
            if (auxCadena.Length > columnasDetalles)
            {
                while (inicio <= auxCadena.Length)
                {
                    auxCadena = auxCadena.Insert(columnasDetalles*pos, espaciado);
                    if (inicio + columnasDetalles < auxCadena.Length)
                        inicio += columnasDetalles;
                    else
                        inicio = auxCadena.Length + 1;
                        pos++;
                }
            }

            int cantidadLineas = auxCadena.Length / columnasDetalles + ((auxCadena.Length % columnasDetalles > 0)?1:0);

            string[] listado = new string[cantidadLineas];

            if (auxCadena.Length <= columnasDetalles)
            {
                listado[0] = cadena;
            }
            else
            {
                for (int i = 0; i < cantidadLineas; i++)
                {
                    int largo = auxCadena.Length > columnasDetalles ? columnasDetalles: auxCadena.Length;
                    string procesar = auxCadena.Substring(0, largo);
                    listado[i] = procesar;
                    auxCadena = auxCadena.Substring(largo, auxCadena.Length - largo);

                }
                Array.Resize(ref lista, lista.Count() + cantidadLineas-1);
            }


            return listado;
        }

        static string IdentarContenidoKDS(string cadena)
        {
            string[] partes = cadena.ToUpper().Split('X');
            int valor = int.Parse(partes[0]);
            string descripcion = cadena.Substring(cadena.ToUpper().IndexOf("X")+1).Trim();
            string numeroFinal = valor < 10 ? " " + valor.ToString() : valor.ToString();
            return numeroFinal + "  " + descripcion;

        }

        static string identarCantidadDescripción(int? valor, string descripcion, int espaciado)
        {
            string numeroFinal = valor < 10 ? " " + valor.ToString() : valor.ToString();
            string espacios = "";

            for (int i = 1; i <= espaciado; i++)
            {
                espacios += " ";
            }
            return numeroFinal + espacios + descripcion;
        }



        static byte[] ConvertirEnRenglones(string cadena)
        {
            int cantidad = cadena.Length;
            string mensaje = "";
            byte[] mensajeFinal = new byte[cadena.Length + "1B6400".Length];
            int contador = 0;

            byte[] intermedio2 = Encoding.UTF8.GetBytes(cadena).Concat(StringToByteArray("1B6400")).ToArray();
            return intermedio2;
        }

        static byte[] ConvertirEnRenglonesSinEnter(string cadena)
        {
            int cantidad = cadena.Length;
            string mensaje = "";
            byte[] mensajeFinal = new byte[cadena.Length];
            int contador = 0;

            byte[] intermedio2 = Encoding.UTF8.GetBytes(cadena).ToArray();
            return intermedio2;


        }

        public static byte[] StringToByteArray(String hex)
        {
            int NumberChars = hex.Length / 2;
            byte[] bytes = new byte[NumberChars];
            using (var sr = new StringReader(hex))
            {
                for (int i = 0; i < NumberChars; i++)
                    bytes[i] =
                      Convert.ToByte(new string(new char[2] { (char)sr.Read(), (char)sr.Read() }), 16);
            }
            return bytes;
        }


        private string quitarTildes(string cadena)
        {
            string resultado;

            resultado = cadena.Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u");
            resultado = resultado.Replace("Á", "A").Replace("É", "E").Replace("Í", "I").Replace("Ó", "O").Replace("Ú", "U").Replace("Ü", "U");

            return resultado;
        }
    }
}
