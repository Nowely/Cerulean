# Пример подключения к проекту генератора
`<ProjectReference Include="..\Tools.Generator.Dto\Tools.Generator.Dto.csproj" OutputItemType="Analyzer" ReferenceOutputAssembly="false"/>`

Без `OutputItemType="Analyzer" ReferenceOutputAssembly="false"` как минимум не будет работать дебаг.

# Roadmap

TODO Генерация комментариев из inherit dock