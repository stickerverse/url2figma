import { ElementNode, ComponentRegistry, ComponentDefinition } from '../types/schema';

interface ComponentMatch {
  nodes: ElementNode[];
  confidence: number;
  matchType: 'structural' | 'visual' | 'semantic';
  signature: string;
  category?: 'button' | 'card' | 'input' | 'navigation' | 'list-item' | 'icon' | 'badge' | 'avatar' | 'other';
}

interface VisualFeatures {
  dimensions: { width: number; height: number; aspectRatio: number };
  colors: string[];
  typography: { fontSize: number; fontWeight: number; fontFamily: string }[];
  spacing: { padding: number[]; margin: number[] };
  borders: { radius: number; width: number };
  shadows: number;
  backgroundType: 'solid' | 'gradient' | 'image' | 'none';
}

interface SemanticFeatures {
  role?: string;
  ariaLabel?: string;
  interactiveType?: 'button' | 'link' | 'input' | 'select';
  semanticClasses: string[];
  htmlTag: string;
  hasIcon: boolean;
  hasText: boolean;
  hasImage: boolean;
}

export class ComponentDetector {
  private structuralThreshold = 0.85;
  private visualThreshold = 0.75;
  private semanticThreshold = 0.70;
  private minInstancesForComponent = 2;
  private componentCounter = 0;

  detectComponents(tree: ElementNode): ComponentRegistry {
    console.log('🔍 Starting advanced component detection...');
    
    const allNodes = this.flattenTree(tree);
    console.log(`   Found ${allNodes.length} total nodes`);

    const structuralMatches = this.structuralDetection(allNodes);
    console.log(`   Structural matches: ${structuralMatches.length} groups`);

    const visualMatches = this.visualSimilarityDetection(allNodes);
    console.log(`   Visual matches: ${visualMatches.length} groups`);

    const semanticMatches = this.semanticDetection(allNodes);
    console.log(`   Semantic matches: ${semanticMatches.length} groups`);

    const mergedMatches = this.mergeWithConfidence([
      ...structuralMatches,
      ...visualMatches,
      ...semanticMatches
    ]);
    console.log(`   Merged to ${mergedMatches.length} unique component groups`);

    const registry = this.buildComponentRegistry(mergedMatches);
    console.log(`✅ Detected ${Object.keys(registry.components).length} components`);

    return registry;
  }

  private structuralDetection(nodes: ElementNode[]): ComponentMatch[] {
    const matches: ComponentMatch[] = [];
    const signatureMap = new Map<string, ElementNode[]>();

    for (const node of nodes) {
      if (!this.isComponentCandidate(node)) continue;

      const signature = this.generateStructuralSignature(node);
      if (!signatureMap.has(signature)) {
        signatureMap.set(signature, []);
      }
      signatureMap.get(signature)!.push(node);
    }

    for (const [signature, groupNodes] of signatureMap.entries()) {
      if (groupNodes.length >= this.minInstancesForComponent) {
        matches.push({
          nodes: groupNodes,
          confidence: this.calculateStructuralConfidence(groupNodes),
          matchType: 'structural',
          signature,
          category: this.categorizeByStructure(groupNodes[0])
        });
      }
    }

    return matches;
  }

  private visualSimilarityDetection(nodes: ElementNode[]): ComponentMatch[] {
    const matches: ComponentMatch[] = [];
    const candidates = nodes.filter(n => this.isComponentCandidate(n));

    const featureGroups = new Map<string, { nodes: ElementNode[]; features: VisualFeatures }[]>();

    for (const node of candidates) {
      const features = this.extractVisualFeatures(node);
      const featureKey = this.hashVisualFeatures(features);

      if (!featureGroups.has(featureKey)) {
        featureGroups.set(featureKey, []);
      }
      featureGroups.get(featureKey)!.push({ nodes: [node], features });
    }

    for (const group of featureGroups.values()) {
      const similarGroups = this.clusterBySimilarity(group);

      for (const cluster of similarGroups) {
        if (cluster.length >= this.minInstancesForComponent) {
          const clusterNodes = cluster.flatMap(c => c.nodes);
          matches.push({
            nodes: clusterNodes,
            confidence: this.calculateVisualConfidence(cluster.map(c => c.features)),
            matchType: 'visual',
            signature: this.hashVisualFeatures(cluster[0].features),
            category: this.categorizeByVisuals(cluster[0].features)
          });
        }
      }
    }

    return matches;
  }

  private semanticDetection(nodes: ElementNode[]): ComponentMatch[] {
    const matches: ComponentMatch[] = [];
    const semanticGroups = new Map<string, ElementNode[]>();

    for (const node of nodes) {
      if (!this.isComponentCandidate(node)) continue;

      const semantic = this.extractSemanticFeatures(node);
      const key = this.generateSemanticKey(semantic);

      if (!semanticGroups.has(key)) {
        semanticGroups.set(key, []);
      }
      semanticGroups.get(key)!.push(node);
    }

    for (const [key, groupNodes] of semanticGroups.entries()) {
      if (groupNodes.length >= this.minInstancesForComponent) {
        matches.push({
          nodes: groupNodes,
          confidence: this.calculateSemanticConfidence(groupNodes),
          matchType: 'semantic',
          signature: key,
          category: this.categorizeBySemantics(this.extractSemanticFeatures(groupNodes[0]))
        });
      }
    }

    return matches;
  }

  private mergeWithConfidence(allMatches: ComponentMatch[]): ComponentMatch[] {
    const nodeToMatches = new Map<string, ComponentMatch[]>();

    for (const match of allMatches) {
      for (const node of match.nodes) {
        if (!nodeToMatches.has(node.id)) {
          nodeToMatches.set(node.id, []);
        }
        nodeToMatches.get(node.id)!.push(match);
      }
    }

    const mergedGroups = new Map<string, ComponentMatch>();

    for (const [nodeId, matches] of nodeToMatches.entries()) {
      if (matches.length === 0) continue;

      const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);
      const bestMatch = sortedMatches[0];

      const overlapBonus = matches.length > 1 ? 0.1 : 0;
      const adjustedConfidence = Math.min(1.0, bestMatch.confidence + overlapBonus);

      const groupKey = bestMatch.signature;

      if (!mergedGroups.has(groupKey)) {
        mergedGroups.set(groupKey, {
          ...bestMatch,
          confidence: adjustedConfidence,
          nodes: []
        });
      }

      const existingGroup = mergedGroups.get(groupKey)!;
      if (!existingGroup.nodes.find(n => n.id === nodeId)) {
        existingGroup.nodes.push(bestMatch.nodes.find(n => n.id === nodeId)!);
      }
    }

    return Array.from(mergedGroups.values())
      .filter(group => group.nodes.length >= this.minInstancesForComponent)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private extractVisualFeatures(node: ElementNode): VisualFeatures {
    const colors: string[] = [];
    if (node.fills) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          colors.push(this.rgbaToHex(fill.color));
        }
      });
    }

    const typography: VisualFeatures['typography'] = [];
    if (node.textStyle) {
      typography.push({
        fontSize: node.textStyle.fontSize,
        fontWeight: node.textStyle.fontWeight,
        fontFamily: node.textStyle.fontFamily
      });
    }

    const padding = node.autoLayout 
      ? [
          node.autoLayout.paddingTop,
          node.autoLayout.paddingRight,
          node.autoLayout.paddingBottom,
          node.autoLayout.paddingLeft
        ]
      : [0, 0, 0, 0];

    const borderRadius = node.cornerRadius 
      ? (node.cornerRadius.topLeft + node.cornerRadius.topRight + 
         node.cornerRadius.bottomLeft + node.cornerRadius.bottomRight) / 4
      : 0;

    const borderWidth = node.strokes && node.strokes.length > 0 
      ? node.strokes[0].thickness 
      : 0;

    const shadowCount = node.effects?.filter(e => 
      e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'
    ).length || 0;

    const backgroundType = this.determineBackgroundType(node);

    return {
      dimensions: {
        width: Math.round(node.layout.width),
        height: Math.round(node.layout.height),
        aspectRatio: node.layout.width / node.layout.height
      },
      colors,
      typography,
      spacing: { padding, margin: [0, 0, 0, 0] },
      borders: { radius: borderRadius, width: borderWidth },
      shadows: shadowCount,
      backgroundType
    };
  }

  private extractSemanticFeatures(node: ElementNode): SemanticFeatures {
    const semanticClasses = this.extractSemanticClasses(node.cssClasses);
    
    const interactiveType = this.determineInteractiveType(node);

    const hasIcon = this.hasIconChild(node);
    const hasText = this.hasTextChild(node);
    const hasImage = this.hasImageChild(node);

    return {
      role: node.ariaLabel,
      ariaLabel: node.ariaLabel,
      interactiveType,
      semanticClasses,
      htmlTag: node.htmlTag,
      hasIcon,
      hasText,
      hasImage
    };
  }

  private extractSemanticClasses(classes: string[]): string[] {
    const semanticPatterns = [
      'btn', 'button', 'card', 'badge', 'avatar', 'icon', 'link',
      'nav', 'menu', 'item', 'list', 'header', 'footer', 'hero',
      'modal', 'dialog', 'dropdown', 'tooltip', 'alert', 'banner',
      'form', 'input', 'select', 'checkbox', 'radio', 'toggle'
    ];

    return classes.filter(cls => 
      semanticPatterns.some(pattern => 
        cls.toLowerCase().includes(pattern)
      )
    );
  }

  private determineInteractiveType(node: ElementNode): SemanticFeatures['interactiveType'] {
    if (node.htmlTag === 'button') return 'button';
    if (node.htmlTag === 'a') return 'link';
    if (node.htmlTag === 'input') return 'input';
    if (node.htmlTag === 'select') return 'select';

    const hasButtonClass = node.cssClasses.some(c => 
      c.toLowerCase().includes('btn') || c.toLowerCase().includes('button')
    );
    if (hasButtonClass) return 'button';

    return undefined;
  }

  private hasIconChild(node: ElementNode): boolean {
    return this.searchTree(node, n => 
      n.type === 'VECTOR' || 
      n.cssClasses.some(c => c.toLowerCase().includes('icon'))
    );
  }

  private hasTextChild(node: ElementNode): boolean {
    return this.searchTree(node, n => n.type === 'TEXT');
  }

  private hasImageChild(node: ElementNode): boolean {
    return this.searchTree(node, n => n.type === 'IMAGE');
  }

  private searchTree(node: ElementNode, predicate: (n: ElementNode) => boolean): boolean {
    if (predicate(node)) return true;
    return node.children.some(child => this.searchTree(child, predicate));
  }

  private clusterBySimilarity(
    items: { nodes: ElementNode[]; features: VisualFeatures }[]
  ): { nodes: ElementNode[]; features: VisualFeatures }[][] {
    const clusters: { nodes: ElementNode[]; features: VisualFeatures }[][] = [];

    for (const item of items) {
      let addedToCluster = false;

      for (const cluster of clusters) {
        const similarity = this.calculateVisualSimilarity(
          item.features,
          cluster[0].features
        );

        if (similarity >= this.visualThreshold) {
          cluster.push(item);
          addedToCluster = true;
          break;
        }
      }

      if (!addedToCluster) {
        clusters.push([item]);
      }
    }

    return clusters;
  }

  private calculateVisualSimilarity(f1: VisualFeatures, f2: VisualFeatures): number {
    let score = 0;
    let weights = 0;

    const dimensionWeight = 0.25;
    const dimensionSimilarity = this.compareDimensions(f1.dimensions, f2.dimensions);
    score += dimensionSimilarity * dimensionWeight;
    weights += dimensionWeight;

    const colorWeight = 0.20;
    const colorSimilarity = this.compareColors(f1.colors, f2.colors);
    score += colorSimilarity * colorWeight;
    weights += colorWeight;

    const typographyWeight = 0.15;
    const typographySimilarity = this.compareTypography(f1.typography, f2.typography);
    score += typographySimilarity * typographyWeight;
    weights += typographyWeight;

    const spacingWeight = 0.15;
    const spacingSimilarity = this.compareSpacing(f1.spacing, f2.spacing);
    score += spacingSimilarity * spacingWeight;
    weights += spacingWeight;

    const borderWeight = 0.15;
    const borderSimilarity = this.compareBorders(f1.borders, f2.borders);
    score += borderSimilarity * borderWeight;
    weights += borderWeight;

    const shadowWeight = 0.10;
    const shadowSimilarity = f1.shadows === f2.shadows ? 1.0 : 0.0;
    score += shadowSimilarity * shadowWeight;
    weights += shadowWeight;

    return score / weights;
  }

  private compareDimensions(d1: VisualFeatures['dimensions'], d2: VisualFeatures['dimensions']): number {
    const widthDiff = Math.abs(d1.width - d2.width) / Math.max(d1.width, d2.width);
    const heightDiff = Math.abs(d1.height - d2.height) / Math.max(d1.height, d2.height);
    const aspectDiff = Math.abs(d1.aspectRatio - d2.aspectRatio) / Math.max(d1.aspectRatio, d2.aspectRatio);

    const tolerance = 0.15;
    
    const widthScore = widthDiff <= tolerance ? 1.0 : Math.max(0, 1 - widthDiff);
    const heightScore = heightDiff <= tolerance ? 1.0 : Math.max(0, 1 - heightDiff);
    const aspectScore = aspectDiff <= tolerance ? 1.0 : Math.max(0, 1 - aspectDiff);

    return (widthScore + heightScore + aspectScore) / 3;
  }

  private compareColors(c1: string[], c2: string[]): number {
    if (c1.length === 0 && c2.length === 0) return 1.0;
    if (c1.length === 0 || c2.length === 0) return 0.0;

    const matches = c1.filter(color => c2.includes(color)).length;
    const total = Math.max(c1.length, c2.length);

    return matches / total;
  }

  private compareTypography(t1: VisualFeatures['typography'], t2: VisualFeatures['typography']): number {
    if (t1.length === 0 && t2.length === 0) return 1.0;
    if (t1.length === 0 || t2.length === 0) return 0.5;

    const style1 = t1[0];
    const style2 = t2[0];

    const fontSizeDiff = Math.abs(style1.fontSize - style2.fontSize) / Math.max(style1.fontSize, style2.fontSize);
    const fontWeightMatch = style1.fontWeight === style2.fontWeight ? 1.0 : 0.0;
    const fontFamilyMatch = style1.fontFamily === style2.fontFamily ? 1.0 : 0.0;

    return (
      (1 - fontSizeDiff) * 0.4 +
      fontWeightMatch * 0.3 +
      fontFamilyMatch * 0.3
    );
  }

  private compareSpacing(s1: VisualFeatures['spacing'], s2: VisualFeatures['spacing']): number {
    const paddingDiffs = s1.padding.map((p, i) => 
      Math.abs(p - s2.padding[i]) / Math.max(p, s2.padding[i], 1)
    );

    const avgDiff = paddingDiffs.reduce((sum, diff) => sum + diff, 0) / paddingDiffs.length;
    return Math.max(0, 1 - avgDiff);
  }

  private compareBorders(b1: VisualFeatures['borders'], b2: VisualFeatures['borders']): number {
    const radiusDiff = Math.abs(b1.radius - b2.radius) / Math.max(b1.radius, b2.radius, 1);
    const widthDiff = Math.abs(b1.width - b2.width) / Math.max(b1.width, b2.width, 1);

    return (
      Math.max(0, 1 - radiusDiff) * 0.6 +
      Math.max(0, 1 - widthDiff) * 0.4
    );
  }

  private calculateStructuralConfidence(nodes: ElementNode[]): number {
    if (nodes.length < 2) return 0;

    const baseScore = 0.7;
    const instanceBonus = Math.min(0.3, (nodes.length - 2) * 0.05);

    return Math.min(1.0, baseScore + instanceBonus);
  }

  private calculateVisualConfidence(features: VisualFeatures[]): number {
    if (features.length < 2) return 0;

    const similarities: number[] = [];
    for (let i = 0; i < features.length - 1; i++) {
      for (let j = i + 1; j < features.length; j++) {
        similarities.push(this.calculateVisualSimilarity(features[i], features[j]));
      }
    }

    const avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
    const instanceBonus = Math.min(0.2, (features.length - 2) * 0.03);

    return Math.min(1.0, avgSimilarity + instanceBonus);
  }

  private calculateSemanticConfidence(nodes: ElementNode[]): number {
    if (nodes.length < 2) return 0;

    const features = nodes.map(n => this.extractSemanticFeatures(n));
    
    const roleMatch = features.every(f => f.role === features[0].role);
    const typeMatch = features.every(f => f.interactiveType === features[0].interactiveType);
    const classMatch = this.compareSemanticClasses(features.map(f => f.semanticClasses));

    const baseScore = (
      (roleMatch ? 0.3 : 0) +
      (typeMatch ? 0.3 : 0) +
      (classMatch * 0.4)
    );

    const instanceBonus = Math.min(0.2, (nodes.length - 2) * 0.04);

    return Math.min(1.0, baseScore + instanceBonus);
  }

  private compareSemanticClasses(classLists: string[][]): number {
    if (classLists.length === 0) return 0;

    const firstClasses = new Set(classLists[0]);
    let totalMatches = 0;
    let totalPossible = 0;

    for (let i = 1; i < classLists.length; i++) {
      const matches = classLists[i].filter(c => firstClasses.has(c)).length;
      totalMatches += matches;
      totalPossible += Math.max(firstClasses.size, classLists[i].length);
    }

    return totalPossible > 0 ? totalMatches / totalPossible : 0;
  }

  private buildComponentRegistry(matches: ComponentMatch[]): ComponentRegistry {
    const registry: ComponentRegistry = { components: {} };

    for (const match of matches) {
      const componentId = `component-${this.componentCounter++}`;
      const componentName = this.generateComponentName(match);

      registry.components[componentId] = {
        id: componentId,
        name: componentName,
        instances: match.nodes.map(n => n.id),
        baseNode: match.nodes[0]
      };

      match.nodes.forEach(node => {
        node.type = 'INSTANCE';
        node.componentId = componentId;
        node.componentKey = match.signature;
        node.isComponent = false;
      });

      match.nodes[0].isComponent = true;
    }

    return registry;
  }

  private generateComponentName(match: ComponentMatch): string {
    const category = match.category || 'Component';
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

    const confidence = Math.round(match.confidence * 100);
    const instanceCount = match.nodes.length;

    return `${categoryName} (${instanceCount}x, ${confidence}% match)`;
  }

  private categorizeByStructure(node: ElementNode): ComponentMatch['category'] {
    const tag = node.htmlTag;
    const classes = node.cssClasses.join(' ').toLowerCase();

    if (tag === 'button' || classes.includes('btn') || classes.includes('button')) {
      return 'button';
    }
    if (classes.includes('card')) return 'card';
    if (classes.includes('badge')) return 'badge';
    if (classes.includes('avatar')) return 'avatar';
    if (tag === 'nav' || classes.includes('nav')) return 'navigation';
    if (tag === 'li' || classes.includes('item')) return 'list-item';

    return 'other';
  }

  private categorizeByVisuals(features: VisualFeatures): ComponentMatch['category'] {
    const { width, height, aspectRatio } = features.dimensions;
    const hasRoundedCorners = features.borders.radius > 5;

    if (aspectRatio >= 0.8 && aspectRatio <= 1.2 && hasRoundedCorners && width < 100) {
      return 'avatar';
    }

    if (width > 200 && height > 100 && hasRoundedCorners) {
      return 'card';
    }

    if (width < 150 && height < 50 && hasRoundedCorners) {
      return 'button';
    }

    if (width < 80 && height < 40 && hasRoundedCorners) {
      return 'badge';
    }

    return 'other';
  }

  private categorizeBySemantics(semantic: SemanticFeatures): ComponentMatch['category'] {
    if (semantic.interactiveType === 'button') return 'button';
    if (semantic.interactiveType === 'input') return 'input';

    const classes = semantic.semanticClasses.join(' ').toLowerCase();
    if (classes.includes('card')) return 'card';
    if (classes.includes('badge')) return 'badge';
    if (classes.includes('avatar')) return 'avatar';
    if (classes.includes('nav') || classes.includes('menu')) return 'navigation';
    if (classes.includes('icon')) return 'icon';

    return 'other';
  }

  private generateStructuralSignature(node: ElementNode): string {
    const childTags = node.children.map(c => c.htmlTag).sort().join(',');
    const childCount = node.children.length;
    const hasText = node.characters ? 'text' : 'notext';
    const hasImage = this.hasImageChild(node) ? 'image' : 'noimage';

    return `${node.htmlTag}|${childCount}|${childTags}|${hasText}|${hasImage}`;
  }

  private hashVisualFeatures(features: VisualFeatures): string {
    const dimKey = `${Math.round(features.dimensions.width / 10)}x${Math.round(features.dimensions.height / 10)}`;
    const colorKey = features.colors.slice(0, 2).join(',');
    const borderKey = `r${Math.round(features.borders.radius)}`;

    return `${dimKey}|${colorKey}|${borderKey}`;
  }

  private generateSemanticKey(semantic: SemanticFeatures): string {
    const parts = [
      semantic.htmlTag,
      semantic.interactiveType || 'none',
      semantic.semanticClasses.slice(0, 2).sort().join(','),
      semantic.hasIcon ? 'icon' : '',
      semantic.hasText ? 'text' : '',
      semantic.hasImage ? 'img' : ''
    ];

    return parts.filter(Boolean).join('|');
  }

  private isComponentCandidate(node: ElementNode): boolean {
    if (node.layout.width < 20 || node.layout.height < 20) return false;

    if (node.children.length === 0 && node.type !== 'TEXT' && node.type !== 'IMAGE') {
      return false;
    }

    const excludedTags = ['html', 'body', 'head', 'script', 'style', 'meta', 'link'];
    if (excludedTags.includes(node.htmlTag)) return false;

    return true;
  }

  private flattenTree(node: ElementNode, result: ElementNode[] = []): ElementNode[] {
    result.push(node);
    node.children.forEach(child => this.flattenTree(child, result));
    return result;
  }

  private determineBackgroundType(node: ElementNode): VisualFeatures['backgroundType'] {
    if (!node.fills || node.fills.length === 0) return 'none';

    const firstFill = node.fills[0];
    if (firstFill.type === 'SOLID') return 'solid';
    if (firstFill.type === 'GRADIENT_LINEAR' || firstFill.type === 'GRADIENT_RADIAL') return 'gradient';
    if (firstFill.type === 'IMAGE') return 'image';

    return 'none';
  }

  private rgbaToHex(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
}
