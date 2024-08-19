namespace AutoDto.Abstractions;

/// <summary>Помечает частичный класс для создания dto</summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public class AutoDtoAttribute(Type domain) : Attribute {
	/// <summary> Тип, на основе которой генерируется dto </summary>
	public Type Domain { get; set; } = domain;

	/// <summary> Поля, по которым будут генерироваться дтошка </summary>
	public string[] Pick { get; set; } = [];

	/// <summary> Обязательные свойства </summary>
	public string[] Required { get; set; } = [];

	/// <summary> Nullable свойства </summary>
	public string[] Nullable { get; set; } = [];
}