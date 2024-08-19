using AutoDto.Abstractions;
using AutoDto.Generator.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace AutoDto.Generator.Extensions;

internal static class CreateDtoProviderExtension {
	/// <summary>
	/// Fully qualified metadata name аттрибута, который используется для идентификации класса участвующего в процессе генерации дто.
	/// <remarks> Цифра 1 в `1 обозначает, что это дженерик с одним принимаемым таким образом параметром </remarks>
	/// </summary>
	private const string DtoAttributeName = "ClassLibrary1.AutoDtoAttribute";
	private const string AttributeName = nameof(AutoDtoAttribute);
	private const string Namespace = nameof(Abstractions);
	private const string LibraryName = nameof(AutoDto);
	private const string QualifiedName = $"{LibraryName}.{Namespace}.{AttributeName}";

	//TODO подписаться и брать исходный код домена
	public static IncrementalValuesProvider<AutoDtoContext> CreateDtoProvider(
		this IncrementalGeneratorInitializationContext context) {
		return context.SyntaxProvider.ForAttributeWithMetadataName(
			QualifiedName,
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
		var attribute = context.Attributes.First();
		return new(context.TargetSymbol, attribute);
	}

	/// <summary> Проверяет, что класс имеет ключевое слово 'Partial' </summary>
	private static bool IsPartial(ClassDeclarationSyntax classDeclaration) {
		return classDeclaration.Modifiers.Any(m => m.IsKind(SyntaxKind.PartialKeyword));
	}
}