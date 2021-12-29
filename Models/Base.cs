namespace Cerulean.Models;

public class Base
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreateOn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ModifiedOn { get; set; } = DateTimeOffset.UtcNow;
}