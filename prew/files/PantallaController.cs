using KDS.Entidades;
using KDS.Modulos;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace KDS.Controllers
{
    [ApiController]
    //[Route("[controller]")]
    [Route("")]
    public class PantallaController : ControllerBase
    {
        [HttpGet("config")]
        public async Task<IActionResult> Index()
        {
            //http://ip:puerto/config
            //desde la pantalla que tiene la IP
            var remoteIpAddress = Request.HttpContext.Connection.RemoteIpAddress;
            Console.WriteLine($"Solicitando configuración de pantalla: {remoteIpAddress}");

            string ipOficial = ConfigMaker.Instance.EsPantallaEspejo(remoteIpAddress.ToString());

            string resultado = ConfigMaker.Instance.configuracionPantalla(ipOficial);
            //Response.Headers.Add("Content-Type", "application/json");
            //Retornar a la pantalla los resultados.
            //return Ok(unap);
            return Ok(resultado);
        }

    }
}
