namespace AutoDto.Types;

public static class AfilterConfigs {
	public static EnumConverter EnumConverter { get; set; }
}

public enum EnumConverter {
	String,
	Number,
}