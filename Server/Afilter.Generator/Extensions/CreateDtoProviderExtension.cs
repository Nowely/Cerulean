using Afilter.Abstractions;
using Afilter.Generator.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Afilter.Generator.Extensions;

internal static class CreateDtoProviderExtension {
	private const string AttributeName = nameof(AutoDtoAttribute);
	private const string Namespace = nameof(Afilter.Abstractions);
	private const string LibraryName = nameof(Afilter);
	private const string QualifiedName = $"{LibraryName}.{Namespace}.{AttributeName}";

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