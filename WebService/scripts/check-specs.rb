require 'yaml'
require 'json'
require 'rexml/document'

# 프로젝트 의존성을 추가하지 않고 YAML 구문/참조, MSW 경로 및 DBML의 구조를 대조한다.
# DBML은 정식 파서 대신 이 프로젝트의 명시적 Table/Ref 문법에 대한 정적 검사다.
root = File.expand_path('..', __dir__)
Dir.chdir(root)
api_path = 'public/specs/API.yml'
dbml_path = 'public/specs/HowToDo.dbml'
spec = YAML.load_file(api_path)
raise 'Unexpected OAS version' unless spec['openapi'] == '3.0.3'

references = []
walk = lambda do |node|
  case node
  when Hash
    if node.key?('$ref')
      ref = node['$ref']
      raise "Non-local reference: #{ref}" unless ref.start_with?('#/')
      value = spec
      ref.delete_prefix('#/').split('/').each do |part|
        key = part.gsub('~1', '/').gsub('~0', '~')
        raise "Unresolved reference: #{ref}" unless value.is_a?(Hash) && value.key?(key)
        value = value[key]
      end
      references << ref
    end
    node.each_value { |value| walk.call(value) }
  when Array
    node.each { |value| walk.call(value) }
  end
end
walk.call(spec)

methods = %w[get post patch delete]
operations = spec['paths'].flat_map do |path, item|
  item.keys.select { |key| methods.include?(key) }.map { |method| "#{method} #{path}" }
end
handlers = File.read('src/mocks/handlers.js').scan(/http\.(get|post|patch|delete)\('\/api([^']+)'/).map do |method, path|
  "#{method} #{path.gsub(/:(\w+)/, '{\1}')}"
end
raise 'MSW/OAS operations differ' unless operations.sort == handlers.sort
raise 'Unexpected operation count' unless operations.length == 20

spec['paths'].each do |path, item|
  item.each do |method, operation|
    next unless methods.include?(method)
    params = (item['parameters'] || []) + (operation['parameters'] || [])
    resolved = params.map { |p| p['$ref'] ? spec['components']['parameters'][p['$ref'].split('/').last] : p }
    path.scan(/\{([^}]+)\}/).flatten.each do |name|
      raise "Missing path parameter: #{method} #{path} #{name}" unless resolved.any? { |p| p['name'] == name && p['in'] == 'path' && p['required'] }
    end
    raise "Missing response: #{method} #{path}" if operation['responses'].nil? || operation['responses'].empty?
  end
end

dbml = File.read(dbml_path)
tables = dbml.scan(/^Table (\w+) \{\n(.*?)^\}/m).to_h.transform_values do |body|
  body.scan(/^  (\w+)\s+([\w]+(?:\(\d+\))?)\s+\[/).to_h
end
relations = dbml.scan(/^Ref: (\w+)\.(\w+) ([><-]) (\w+)\.(\w+)/)
raise 'Unexpected DBML structure' unless tables.length == 8 && tables.values.sum(&:length) == 33 && relations.length == 8
relations.each do |left_table, left_field, _, right_table, right_field|
  left = tables.fetch(left_table).fetch(left_field)
  right = tables.fetch(right_table).fetch(right_field)
  raise 'Foreign-key type mismatch' unless left == right
end

# 발표 ERD의 필드명과 타입·varchar 길이까지 DBML과 같은지 확인한다.
svg = REXML::Document.new(File.read('report-assets/redesign/full-erd.svg'))
tables.each do |name, fields|
  group = svg.root.elements.to_a('g').find { |g| g.attributes['aria-label'] == name }
  raise "Missing ERD table: #{name}" unless group
  labels = group.elements.to_a('text').select { |t| t.attributes['class'] == 'field' }
  raise "ERD fields differ: #{name}" unless labels.map { |t| t.text.delete_suffix('*') }.sort == fields.keys.sort
  labels.each do |label|
    field = label.text.delete_suffix('*')
    type = group.elements.to_a('text').find { |t| t.attributes['class'] == 'type' && t.attributes['y'] == label.attributes['y'] }
    expected = fields[field].sub('ProfileVisibility', 'enum')
    raise "ERD type differs: #{name}.#{field}" unless type && type.text == expected
  end
end

# 연결선의 부모 PK / 자식 FK가 실제 DBML Ref의 양 끝과 같은지 대조한다.
erd_relations = svg.root.elements.to_a('g').select { |g| g.attributes['data-parent'] }.map do |group|
  [group.attributes['data-parent'], group.attributes['data-child']]
end
expected_relations = relations.map do |left_table, left_field, direction, right_table, right_field|
  left, right = "#{left_table}.#{left_field}", "#{right_table}.#{right_field}"
  direction == '>' ? [right, left] : [left, right]
end
raise 'ERD relationships differ from DBML' unless erd_relations.sort == expected_relations.sort

raise 'API copies differ' unless File.binread(api_path) == File.binread('산출물/1반_장현진_HowToDo-API.yml')
raise 'DBML copies differ' unless File.binread(dbml_path) == File.binread('산출물/1반_장현진_HowToDo-DB.dbml')
raise 'Old filename remains' if File.exist?('public/specs/openapi.yaml') || File.exist?('산출물/openapi.yaml')
result = { yamlParsed: true, referencesResolved: references.length, operations: operations.length,
           schemas: spec['components']['schemas'].length, tags: spec['tags'].length,
           dbmlTables: tables.length, dbmlFields: tables.values.sum(&:length), dbmlRelations: relations.length,
           dbmlValidation: 'static structure and reference/type checks, not a full DBML parser',
           erdMatchesDbml: true, erdRelationsMatchDbml: true, copiesIdentical: true }
File.write('report-assets/redesign/spec-checks.json', JSON.pretty_generate(result) + "\n")
puts JSON.pretty_generate(result)
