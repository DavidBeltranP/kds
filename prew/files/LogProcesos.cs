using KDS.Entidades;
using KDS.Interfaces;
using KDS.Repositorios;
using System.Runtime.CompilerServices;

namespace KDS.Modulos
{
    public class LogProcesos
    {

        private static StreamWriter archivo;
        private static string fecha;

        private static LogProcesos instance = null;

        private LogProcesos()
        {

        }

        public static LogProcesos Instance
        {
            get
            {
                if (instance == null)
                {

                    instance = new LogProcesos();
                    archivo = new StreamWriter($"{Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location)}\\logs\\log {DateTime.Now.Date.ToString("u").Substring(0, 10)}.txt", true);
                    fecha = DateTime.Now.Date.ToString("u").Substring(0, 10);

                }
                return instance;
            }
        }

        /// <summary>
        /// Escribir en archivo log.
        /// </summary>
        /// <param name="mensaje">Mensaje a escribir.</param>
        public void Escribir( string mensaje)
        {
            if (DateTime.Now.Date.ToString("u").Substring(0, 10) != fecha)
            {
                fecha = DateTime.Now.Date.ToString("u").Substring(0, 10);
                archivo.Close();
                archivo.Dispose();

                archivo = new StreamWriter($"{Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location)}\\logs\\log {DateTime.Now.Date.ToString("u").Substring(0, 10)}.txt", true);

                string[] files = Directory.GetFiles($"{Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location)}\\logs");

                foreach (string file in files)
                {
                    FileInfo fi = new FileInfo(file);
                    int? valorRetencionLog = ConfigMaker.Instance.configVisible.Generales.diasRetencionLog;
                    if (valorRetencionLog != null)
                        if (fi.CreationTime < DateTime.Now.AddDays((double)-valorRetencionLog))
                            fi.Delete();
                }
            }

            archivo.WriteLine($"{DateTime.Now} - {mensaje}");
            archivo.Flush();
        }
    }
}
