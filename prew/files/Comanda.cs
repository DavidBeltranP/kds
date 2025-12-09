using System.Diagnostics;

namespace KDS.Entidades
{
    public class CashRegister
    {
        public string cashier { get; set; }
        public string name { get; set; }
    }

    public class ChannelC
    {
        public int id { get; set; }
        public string name { get; set; }
        public string type { get; set; }
    }

    public class OtrosDatos
    {
        public int turno { get; set; }
        public string nroCheque { get; set; }
        public string llamarPor { get; set; }
        public string Fecha { get; set; }
        public string Direccion { get; set; }
    }

    public class Customer
    {
        public string name { get; set; }
    }

    public class Comanda
    {
        public string? id { get; set; }
        public string createdAt { get; set; }
        public string? orderId { get; set; }
        public ChannelC? channel { get; set; }
        public CashRegister? cashRegister { get; set; }
        public Customer? customer { get; set; }
        public List<Product>? products { get; set; }
        public OtrosDatos otrosDatos { get; set; }
        public string impresion { get; set; }
    }

    public class Product
    {
        public string? productId { get; set; }
        public string? name { get; set; }
        public List<string>? content { get; set; }
        public int? amount { get; set; }
        public string? category { get; set; }
        public List<Product2>? products { get; set; }
    }

    public class Product2
    {
        public string? productId { get; set; }
        public string? name { get; set; }
        public int? amount { get; set; }
        public string? category { get; set; }
        public List<string>? content { get; set; }
    }
}
