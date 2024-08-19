using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Tools.Generator.Dto.Models;

namespace Tools.Generator.Dto.Extensions;

internal static class CreateDtoProviderExtension {
	/// <summary>
	/// Fully qualified metadata name аттрибута, который используется для идентификации класса участвующего в процессе генерации дто.
	/// <remarks> Цифра 1 в `1 обозначает, что это дженерик с одним принимаемым таким образом параметром </remarks>
	/// </summary>
	private const string DtoAttributeName = "ClassLibrary1.AutoDtoAttribute";

	//TODO подписаться и брать исходный код домена
	public static IncrementalValuesProvider<AutoDtoContext> CreateDtoProvider(
		this IncrementalGeneratorInitializationContext context) {
		return context.SyntaxProvider.ForAttributeWithMetadataName(
			DtoAttributeName,
			WherePredicate,
			Transform
		);
	}


	/// <summary>Фильтр для пайплайна</summary>
	private static bool WherePredicate(SyntaxNode syntaxNode, CancellationToken cancellationToken) {
		return syntaxNode is ClassDeclarationSyntax classDeclaration && IsPartial(classDeclaration);
	}

	/// <summary>Трансформация всех отфильтрованных узлов</summary>
	private static AutoDtoContext Transform(GeneratorAttributeSyntaxContext context,
		CancellationToken cancellationToken) {
		AttributeData attribute = context.Attributes.First();
		var a = attribute.MapToType<AutoDtoAttribute>();
		//AutoDtoAttribute<>
		return new(context.TargetSymbol, attribute);
	}

	public static T MapToType<T>(this AttributeData attributeData) where T : Attribute
	{
		T attribute;
		if (attributeData.AttributeConstructor != null && attributeData.ConstructorArguments.Length > 0)
		{
			attribute = (T) Activator.CreateInstance(typeof(T), attributeData.GetActualConstuctorParams().ToArray());
		}
		else
		{
			attribute = (T) Activator.CreateInstance(typeof(T));
		}

		foreach (var p in attributeData.NamedArguments)
		{
			typeof(T).GetField(p.Key).SetValue(attribute, p.Value.Value);
		}
		return attribute;
	}

	public static IEnumerable<object> GetActualConstuctorParams(this AttributeData attributeData)
	{
		foreach (var arg in attributeData.ConstructorArguments)
		{
			if (arg.Kind == TypedConstantKind.Array)
			{
				// Assume they are strings, but the array that we get from this
				// should actually be of type of the objects within it, be it strings or ints
				// This is definitely possible with reflection, I just don't know how exactly.
				yield return arg.Values.Select(a => a.Value).OfType<string>().ToArray();
			}
			else
			{
				yield return arg.Value!;
			}
		}
	}


	private static bool IsPartial(ClassDeclarationSyntax classDeclaration) {
		return classDeclaration.Modifiers.Any(m => m.IsKind(SyntaxKind.PartialKeyword));
	}
}