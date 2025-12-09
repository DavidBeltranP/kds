using KDS.Entidades;
using System.Linq.Expressions;

namespace KDS.Modulos
{
    public class bdKDS2
    {
        private List<tComanda> listaComandas { get; set; }
        private List<tDistribucion> listaDistribucion { get; set; }

        private readonly ReaderWriterLockSlim _lock = new();

        private static bdKDS2 instance = null;

        private bdKDS2()
        {
            this.listaComandas = new List<tComanda>();
            this.listaDistribucion = new List<tDistribucion>();
        }

        public static bdKDS2 Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = new bdKDS2();

                }
                return instance;
            }
        }

        public void CargarComandas(string unaOrden, string unaComanda, DateTime unaFechaIngreso, string unEstadoComanda, string unaFechaCreacion, int unaReimpresion)
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaComandas.Add(new tComanda() { IdOrden = unaOrden, datosComanda = unaComanda, fechaIngreso = unaFechaIngreso, idEstadoComanda = unEstadoComanda, fechaCreacion = unaFechaCreacion, Reimpresion = unaReimpresion });
            }
            finally { _lock.ExitWriteLock(); }


        }

        public void CargarDistribucion(string unaOrden, string unaCola, string unaPantalla, string unEstadoDistribucion, DateTime unaFechaModificacion)
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaDistribucion.Add(new tDistribucion() { idOrden = unaOrden, Cola = unaCola, Pantalla = unaPantalla, IdEstadoDistribucion = unEstadoDistribucion, fechaModificacion = unaFechaModificacion });
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_ComandasInsertar(tComanda unaComanda)
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaComandas.Add(unaComanda);
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_DistribucionInsertar(tDistribucion unaDistribucion)
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaDistribucion.Add(unaDistribucion);
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_DistribucionActualizarPantalla(string unaOrden, string unaCola, string unaPantalla, string unEstadoDistribucion)
        {
            _lock.EnterWriteLock();
            try
            {
                tDistribucion actualizar = this.listaDistribucion.FirstOrDefault(x => x.idOrden == unaOrden && x.Cola == unaCola);
                actualizar.Pantalla = unaPantalla;
                actualizar.IdEstadoDistribucion = unEstadoDistribucion;
            }
            finally { _lock.ExitWriteLock(); }

        }

        public List<tComanda> ObtenerComandas(string unaCola, string unaPantalla)
        {
            _lock.EnterReadLock();
            try
            {
                List<tComanda> listaFitrada = this.listaComandas.FindAll(x => listaDistribucion.Exists(y => y.idOrden == x.IdOrden && y.Cola == unaCola && y.Pantalla == unaPantalla)).OrderBy(x => x.fechaIngreso.ToString("o")).ToList();
                return listaFitrada;
            }
            finally { _lock.ExitReadLock(); }

        }

        public void SP_DistribucionDeshacer(string unaOrden, string unDatosComanda, string unaFechaCreacion, DateTime unaFechaIngreso, string unEstadoComanda, int unaReimpresion,
            string unaCola, string unaPantalla, string unEstadoDistribucion, DateTime unafechaModificacion)
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaDistribucion.Add(new tDistribucion { idOrden = unaOrden, Cola = unaCola, Pantalla = unaPantalla, IdEstadoDistribucion = unEstadoDistribucion, fechaModificacion = unafechaModificacion });
            if (this.listaComandas.Exists(x=> x.IdOrden == unaOrden) == false)
                this.listaComandas.Add(new tComanda() { IdOrden = unaOrden, datosComanda = unDatosComanda, fechaCreacion = unaFechaCreacion, fechaIngreso = unaFechaIngreso, idEstadoComanda = unEstadoComanda, Reimpresion = unaReimpresion });
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_DistribucionImprimir(string unaOrden, string unaCola, string unaPantalla)
        {
            _lock.EnterWriteLock();
            try
            {
                tDistribucion distribucionABorrar = this.listaDistribucion.FirstOrDefault(x => x.idOrden == unaOrden && x.Cola == unaCola && x.Pantalla == unaPantalla);
                this.listaDistribucion.Remove(distribucionABorrar);

                int cantidad = this.listaDistribucion.Count(x => x.idOrden == unaOrden);

                if (cantidad == 0)
                {
                    tComanda comandaABorrar = this.listaComandas.FirstOrDefault(x => x.IdOrden == unaOrden);
                    this.listaComandas.Remove(comandaABorrar);
                }
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_DistribucionImprimir(string unaOrden)
        {
            _lock.EnterWriteLock();
            try
            {
                tDistribucion distribucionABorrar = this.listaDistribucion.FirstOrDefault(x => x.idOrden == unaOrden);
                this.listaDistribucion.Remove(distribucionABorrar);

                int cantidad = this.listaDistribucion.Count(x => x.idOrden == unaOrden);

                if (cantidad == 0)
                {
                    tComanda comandaABorrar = this.listaComandas.FirstOrDefault(x => x.IdOrden == unaOrden);
                    this.listaComandas.Remove(comandaABorrar);
                }
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_DistribucionColaASinPantalla(string unaCola)
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaDistribucion.Where(x => x.Cola == unaCola).ToList().ForEach(x => { x.Pantalla = "SIN_PANTALLA"; x.fechaModificacion = DateTime.Now; x.IdEstadoDistribucion = "SIN_PANTALLA"; });
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_DistribucionAsignarSinPantalla(string unaOrden, string unaCola)
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaDistribucion.Where(x => x.Cola == unaCola && x.idOrden == unaOrden).ToList().ForEach(x => { x.Pantalla = ""; x.IdEstadoDistribucion = "SIN_PANTALLA"; });
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void SP_DistribucionLimpiarAsignacion(string cola, string pantalla)
        {
            _lock.EnterWriteLock();
            try
            {
                listaDistribucion.Where(x => x.Cola == cola && x.Pantalla == pantalla).ToList().ForEach(x => x.IdEstadoDistribucion = "REASIGNAR");
            }
            finally { _lock.ExitWriteLock(); }
        }

        public tComanda SP_ComandaLeer(string idOrden)
        {

            _lock.EnterReadLock();
            try
            {
                return this.listaComandas.Where(x => x.IdOrden == idOrden).FirstOrDefault();
            }
            finally { _lock.ExitReadLock(); }


        }

        public void SP_AnularComandasPorTiempo(int tiempo)
        {
            _lock.EnterWriteLock();
            try
            {
                List<tComanda> listaComandasAnular = this.listaComandas.Where(x => x.fechaIngreso.AddMinutes(tiempo) <= DateTime.Now).ToList();
                List<tDistribucion> listaDistribucionAnular = this.listaDistribucion.FindAll(x => listaComandasAnular.Exists(y => y.IdOrden == x.idOrden)).ToList();

                for (int i = 0; i < listaDistribucionAnular.Count; i++)
                {
                    this.listaDistribucion.Remove(listaDistribucionAnular[i]);
                }
                for (int i = 0; i < listaComandasAnular.Count; i++)
                {
                    this.listaComandas.Remove(listaComandasAnular[i]);
                }
            }
            finally { _lock.ExitWriteLock(); }
        }

        public void LimpiarListas()
        {
            _lock.EnterWriteLock();
            try
            {
                this.listaDistribucion.Clear();
                this.listaComandas.Clear();
                this.listaComandas = new List<tComanda>();
                this.listaDistribucion = new List<tDistribucion>();
            }
            finally { _lock.ExitWriteLock(); }
        }

    }
}
