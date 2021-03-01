using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Cerulean.Models
{
    public class Base
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTimeOffset CreateOn { get; set; } = DateTimeOffset.Now;
        public DateTimeOffset ModifiedOn { get; set; } = DateTimeOffset.Now;
    }
}