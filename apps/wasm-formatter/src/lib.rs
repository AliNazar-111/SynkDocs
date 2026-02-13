use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Node {
    #[serde(rename = "type")]
    node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<Vec<Node>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attrs: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    marks: Option<Vec<Value>>,
}

#[wasm_bindgen]
pub fn format_document(json_input: &str) -> Result<String, JsValue> {
    // Parse the input JSON representing the TipTap document
    let mut doc: Node = serde_json::from_str(json_input)
        .map_err(|e| JsValue::from_str(&format!("Invalid JSON: {}", e)))?;

    if doc.node_type != "doc" {
        return Err(JsValue::from_str("Input must be a 'doc' type"));
    }

    // Process document content recursively
    if let Some(content) = doc.content {
        doc.content = Some(process_content(content));
    }

    // Return the formatted JSON string
    serde_json::to_string(&doc)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

fn process_content(nodes: Vec<Node>) -> Vec<Node> {
    let mut formatted_nodes = Vec::new();

    for mut node in nodes {
        // 1. Text Normalization (less aggressive)
        if node.node_type == "text" {
            if let Some(mut t) = node.text {
                // Collapse multiple spaces into one, but preserve other whitespace (tabs, etc)
                while t.contains("  ") {
                    t = t.replace("  ", " ");
                }
                
                if !t.is_empty() {
                    node.text = Some(t);
                    formatted_nodes.push(node);
                }
            }
            continue;
        }

        // 2. Process Heading Normalization
        if node.node_type == "heading" {
            node.attrs = normalize_heading_attrs(node.attrs);
        }

        // 3. Recursive processing for nested content
        if let Some(content) = node.content {
            node.content = Some(process_content(content));
        }

        // 4. Final validation
        // KEEP empty paragraphs as they are used for spacing
        if is_valid_node(&node) {
            formatted_nodes.push(node);
        }
    }

    formatted_nodes
}

fn normalize_heading_attrs(attrs: Option<Value>) -> Option<Value> {
    if let Some(mut a) = attrs {
        if let Some(level) = a.get("level") {
            let l = level.as_i64().unwrap_or(2);
            let normalized_level = if l < 1 { 1 } else if l > 6 { 6 } else { l };
            if let Some(obj) = a.as_object_mut() {
                obj.insert("level".to_string(), Value::from(normalized_level));
            }
        }
        Some(a)
    } else {
        let mut map = serde_json::Map::new();
        map.insert("level".to_string(), Value::from(2));
        Some(Value::Object(map))
    }
}

fn is_valid_node(node: &Node) -> bool {
    match node.node_type.as_str() {
        // Empty paragraphs are valid (acting as newlines)
        "paragraph" => true,
        "heading" => {
            // Headings should usually have content to be valid
            node.content.as_ref().map_or(false, |c| !c.is_empty())
        }
        "image" => node.attrs.is_some(),
        _ => true,
    }
}

// Optimization: deterministic helper
#[wasm_bindgen]
pub fn get_version() -> String {
    "1.0.0".to_string()
}
