using KDS.Entidades;
using KDS.Modulos;
using Microsoft.AspNetCore.Mvc;
using System.Drawing;
using System.Net;
using System.Text.Json;
using System.Threading.Channels;

namespace KDS.Controllers
{
    [ApiController]
    [Route("")]
    public class ComandasController : ControllerBase
    {

        [HttpPost("comandas")]
        public IActionResult ListarComandas([FromBody] Acciones listaComandas)
        {

            Console.WriteLine("Recibido: ");
            foreach (string item in listaComandas.userActions)
            {
                Console.WriteLine(item);
            }
            ScreenManager screenManager = new ScreenManager();
            var remoteIpAddress = Request.HttpContext.Connection.RemoteIpAddress;

            string IPAddress = remoteIpAddress.ToString();

            if (remoteIpAddress.ToString() == "::1")
            {
                IPAddress = ConfigMaker.Instance.configVisible.ipPropia;
            }

            Console.WriteLine(IPAddress);
            string ipOficial = ConfigMaker.Instance.EsPantallaEspejo(IPAddress);
            Console.WriteLine($"Pantalla final: {ipOficial}");
            screenManager.ActualizarComanda(listaComandas.userActions, ipOficial);
            string resultados = screenManager.MostrarComandas(ipOficial);
            if (resultados == null)
                resultados = "[]";

            return Ok(resultados);
        }
    }
}
