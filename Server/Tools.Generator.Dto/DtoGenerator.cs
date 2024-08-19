using Microsoft.CodeAnalysis;
using Tools.Generator.Dto.Extensions;

namespace Tools.Generator.Dto;

/// <summary> Генератор, который на основе модели генерирует его суб модель с аналогичными именами и комментариями </summary>
[Generator]
public class DtoGenerator : IIncrementalGenerator {
	/// <inheritdoc />
	public void Initialize(IncrementalGeneratorInitializationContext context) {
		var dtoProvider = context.CreateDtoProvider();

		context.RegisterSourceOutput(dtoProvider, CodeGenerator.Generate);
	}
}