using Microsoft.CodeAnalysis;
using AutoDto.Generator.Extensions;

namespace AutoDto.Generator;

/// <summary> Генератор, который на основе модели генерирует его суб модель с аналогичными именами и комментариями </summary>
[Generator]
public class DtoGenerator : IIncrementalGenerator {
	/// <inheritdoc />
	public void Initialize(IncrementalGeneratorInitializationContext context) {
		var dtoProvider = context.CreateDtoProvider();

		context.RegisterSourceOutput(dtoProvider, CodeGenerator.Generate);
	}
}