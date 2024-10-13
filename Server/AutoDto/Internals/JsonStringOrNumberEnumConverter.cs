using System.Text.Json;
using System.Text.Json.Serialization;
using AutoDto.Types;

namespace AutoDto.Internals;

internal class JsonStringOrNumberEnumConverter<TEnum> : JsonConverterFactory
	where TEnum : struct, System.Enum {
	private static JsonConverter? _converter;

	/// <inheritdoc />
	public override bool CanConvert(Type typeToConvert) => typeToConvert.IsEnum;

	/// <inheritdoc />
	public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options) {
		if (_converter is not null) return _converter;

		_converter = AfilterConfigs.EnumConverter == EnumConverter.String
			? new JsonStringEnumConverter<TEnum>().CreateConverter(typeToConvert, options)
			: new JsonNumberEnumConverter<TEnum>().CreateConverter(typeToConvert, options);
		return _converter;
	}
}