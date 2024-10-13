namespace AutoDto.Extensions;

internal static class EnumExtensions {
	public static TDestination? MapByName<TDestination, TSource>(this TSource source)
		where TSource : struct, Enum
		where TDestination : struct, Enum
		=> Enum.TryParse<TDestination>(source.ToString(), out var destination)
			? destination
			: null;
}