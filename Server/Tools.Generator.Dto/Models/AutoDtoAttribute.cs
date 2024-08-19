namespace Tools.Generator.Dto.Models;

/// <summary>Атрибут для создания DTO</summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public class AutoDtoAttribute : Attribute {

	/// <summary> Поля, по которым будут генерироваться дтошка </summary>
	public string[] Props { get; set; } = [];

	/// <summary> Обязательные свойства </summary>
	public string[] Requires { get; set; } = [];

	/// <summary> Nullable свойства </summary>
	public string[] Nullables { get; set; } = [];

	public object? Type { get; set; }
}