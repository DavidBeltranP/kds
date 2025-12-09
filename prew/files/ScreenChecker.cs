using KDS.Entidades;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Net.NetworkInformation;

namespace KDS.Modulos
{
    public class ScreenChecker
    {
        public List<Pantalla> listaPantallas { get; set; }
        public Dictionary<string, bool> colasProblemas { get; set; }

        private readonly bdKDS2 _storage;

        private static ScreenChecker instance = null;

        private ScreenChecker()
        {
            this.listaPantallas = ConfigMaker.Instance.listarPantallas();
        }

        public static ScreenChecker Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = new ScreenChecker();
                }
                return instance;
            }
        }

        public List<Pantalla> Estados()
        {
            return this.listaPantallas;
        }

        public List<Pantalla> PantallasActivas()
        {
            return this.listaPantallas.Where(pantalla => pantalla.activa == true).ToList();

        }

        public List<Pantalla> PantallasActivas(string nombreCola)
        {
            return this.listaPantallas.Where(pantalla => pantalla.activa == true && pantalla.cola == nombreCola).ToList();
        }

        public List<Pantalla> Pantallas(string nombreCola)
        {
            return this.listaPantallas.Where(pantalla => pantalla.cola == nombreCola).ToList();
        }

        public Pantalla Estados(string nombre)
        {
            return this.listaPantallas.Where(pantalla => pantalla.nombre == nombre).FirstOrDefault();
        }

        public Pantalla detallePantalla(string ipPantalla)
        {
            return this.listaPantallas.Where(pantalla => pantalla.ip == ipPantalla).FirstOrDefault();

        }


        /// <summary>
        /// Indicar a la pantalla que está activa y setearle el timestamp a ahora.
        /// </summary>
        /// <param name="ipPantalla">IP de la pantalla.</param>
        public void Activar(string ipPantalla)
        {
            for (int i = 0; i < this.listaPantallas.Count; i++)
            {
                if (this.listaPantallas[i].ip == ipPantalla)
                {
                    this.listaPantallas[i].activa = true;
                    this.listaPantallas[i].tiempoActiva = DateTime.Now;
                    LogProcesos.Instance.Escribir($"Pantalla activa: {ipPantalla}");
                    ////Activo mecanismo de asignación de comandas a pantallas
                    ////para aquellas comadnas que tienen una cola asignada
                    ////pero las pantallas no se han encendido nunca o en algún momento se apagaron todas.
                    DistribuidorPantallas distribuidorPantallas = new DistribuidorPantallas();
                    distribuidorPantallas.AsignarComandasSinPantalla(ipPantalla);
                    break;
                }

            }
        }

        /// <summary>
        /// Solo pone en inactiva la pantalla, No se afecta el tiempo de vida porque solo se quita de pantallas disponibles.
        /// </summary>
        /// <param name="ip">IP de la pantalla.</param>
        public void  DesactivarPantalla(string ip)
        {
            LogProcesos.Instance.Escribir($"Desactivando pantalla {ip}");

            for (int i = 0; i < this.listaPantallas.Count; i++)
            {
                if (this.listaPantallas[i].ip == ip)
                {
                    this.listaPantallas[i].activa = false;
                    break;
                }

            }

            DistribuidorPantallas distribuidorPantallas = new DistribuidorPantallas();
            LogProcesos.Instance.Escribir($"Reasignando comandas pantalla {ip}");
            distribuidorPantallas.ReasignarComandas(ip);

        }


        /// <summary>
        /// Desactivar una pantalla porque permaneció mucho tiempo sin pedir comandas.
        /// El cálculo es: Tiempo de vida * 3. Si superó ese tiempo sin pedir, se considera inactiva.
        /// </summary>
        public void Desactivar()
        {
            while (true)
            {
                foreach (Pantalla pantalla in this.listaPantallas)
                {
                    if (pantalla.tiempoActiva.AddSeconds(ConfigMaker.Instance.configVisible.Generales.tiempoVida * 3) < DateTime.Now)
                    {
                        //Solo desactivo si efectivamente estaba encendida y activo mecanismo de balanceo.
                        if (pantalla.activa != false)
                        {
                            Console.WriteLine($"Desactivando pantalla por inactividad: {pantalla.ip}");
                            LogProcesos.Instance.Escribir($"Desactivando pantalla por inactividad: {pantalla.ip}");
                            for (int i = 0; i < this.listaPantallas.Count; i++)
                            {
                                if (this.listaPantallas[i].ip == pantalla.ip)
                                {
                                    this.listaPantallas[i].activa = false;
                                    break;
                                }

                            }
                            //Controlo cuántas pantallas existen
                            //Si es 1, no hay rebalanceo.
                            //Si hay más de una, reasigno a la que menos tenga
                            //Si hay cero activas, deben quedar todas en null
                            DistribuidorPantallas distribuidorPantallas = new DistribuidorPantallas();
                            distribuidorPantallas.ReasignarComandas(pantalla.ip);

                        }
                    }



                }
                Thread.Sleep(ConfigMaker.Instance.configVisible.Generales.tiempoVida * 1000);
            }

        }

        public async void ValidarPantallas(string pantallaViva)
        {
            foreach (Pantalla unaPantalla in listaPantallas)
            {
                using (Ping ping = new())
                {
                    string hostName = unaPantalla.nombre;
                    PingReply reply = await ping.SendPingAsync(hostName);
                    Console.WriteLine($"Ping status for ({hostName}): {reply.Status}");
                    if (reply is { Status: IPStatus.Success })
                    {
                        Console.WriteLine($"Address: {reply.Address}");
                        Console.WriteLine($"Roundtrip time: {reply.RoundtripTime}");
                        Console.WriteLine($"Time to live: {reply.Options?.Ttl}");
                        Console.WriteLine();
                    }
                }
            }

        }

        public void RebalancearComandasPorPantalla(string ipPantalla)
        {
            DistribuidorPantallas distribuidorPantallas = new DistribuidorPantallas();
            distribuidorPantallas.BalancearPorNuevaPantallaActiva(ipPantalla);
        }

        public void CargarPantallas()
        {
            this.listaPantallas = new List<Pantalla>();
            foreach (Pantalla item in ConfigMaker.Instance.listarPantallas())
            {

                this.listaPantallas.Add(new Pantalla
                {
                    activa = false,
                    cola = item.cola,
                    impresoraIP = item.impresoraIP,
                    impresoraNombre = item.impresoraNombre,
                    imprime = item.imprime,
                    ip = item.ip,
                    tiempoActiva = item.tiempoActiva,
                    nombre = item.nombre,
                    filtros = item.filtros,
                    cantidad = item.cantidad,
                    contar = item.contar,
                    propiedades = item.propiedades
                });
            }

            //El sistema interpreta que todas las colas tienen comandas asignadas, pero no hay pantallas activas.
            this.colasProblemas = new Dictionary<string, bool>();

            foreach (Cola cola in ConfigMaker.Instance.listarColas())
            {
                this.colasProblemas.Add(cola.nombre, true);
            }
        }


    }
}
