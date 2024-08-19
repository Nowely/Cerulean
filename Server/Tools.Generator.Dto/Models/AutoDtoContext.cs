using Microsoft.CodeAnalysis;

namespace Tools.Generator.Dto.Models;

internal record AutoDtoContext(ISymbol DtoSymbol, AttributeData Attribute) {
	public ISymbol DtoSymbol { get; } = DtoSymbol;
	public AttributeData Attribute { get; } = Attribute;

	public ITypeSymbol DomainSymbol { get; } = Attribute.AttributeClass?.TypeArguments.First() ??
	                                           throw new InvalidOperationException("Cannot get DomainSymbol");

	//public string[] Props { get; set; } = Attribute.NamedArguments["Props"].Value.Values<string>().ToArray();

	public string[] FieldNames { get; } = Attribute.ConstructorArguments[0].Values
		.Where(v => v.Value is not null)
		.Select(x => x.Value!.ToString())
		.ToArray();

	public IPropertySymbol[] Fields => DomainSymbol
		.GetMembers().OfType<IPropertySymbol>()
		.Where(x => FieldNames.Contains(x.Name)).ToArray();

	/*private T GetAttributeValue<T>(string attributeName) {
		Attribute.NamedArguments
			.FirstOrDefault(pair => pair.Key == "Props").Value.Values
			.Select(x => x.Value.ToString())
	}*/
}