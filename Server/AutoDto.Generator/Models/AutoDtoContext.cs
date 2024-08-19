using AutoDto.Abstractions;
using Microsoft.CodeAnalysis;

namespace AutoDto.Generator.Models;

internal class AutoDtoContext(ISymbol dto, AttributeData attribute) {
	public AttributeData Attribute { get; } = attribute;

	/// <summary> Класс, к которому прикреплен атрибут </summary>
	public ITypeSymbol Dto { get; } = (ITypeSymbol)dto;

	/// <inheritdoc cref="AutoDtoAttribute.Domain"/>
	public ITypeSymbol Domain { get; } = ExtractDomainSymbol(attribute);

	/// <inheritdoc cref="AutoDtoAttribute.Pick"/>
	public string[] Pick { get; } = ExtractValues(attribute, nameof(AutoDtoAttribute.Pick));

	/// <summary> Символы свойств, которые будут в dto </summary>
	public IPropertySymbol[] Properties => Domain
		.GetMembers()
		.OfType<IPropertySymbol>()
		.Where(x => Pick.Contains(x.Name))
		.ToArray();

	/// <summary> Извлекает тип доменной модели, по которой генерируется dto. </summary>
	private static ITypeSymbol ExtractDomainSymbol(AttributeData attribute) {
		return (ITypeSymbol)attribute.ConstructorArguments.First().Value!;
	}

	/// <summary> Извлекает массив строк из атрибута по имени свойства. Работает только для массива строк. </summary>
	private static string[] ExtractValues(AttributeData attribute, string name) {
		var pair = attribute.NamedArguments.First(pair => pair.Key == name);

		if (pair.Key is null) return Array.Empty<string>();

		return pair.Value.Values
			.Select(x => x.Value)
			.OfType<string>()
			.ToArray();
	}
}