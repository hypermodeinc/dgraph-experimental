"use client"

import React, { useState, useEffect } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
import klay from "cytoscape-klay";
const layoutMap = {
  euler: {
    name: 'euler',
  
    // The ideal length of a spring
    // - This acts as a hint for the edge length
    // - The edge length can be longer or shorter if the forces are set to extreme values
    springLength: edge => 80,
  
    // Hooke's law coefficient
    // - The value ranges on [0, 1]
    // - Lower values give looser springs
    // - Higher values give tighter springs
    springCoeff: edge => 0.0008,
  
    // The mass of the node in the physics simulation
    // - The mass affects the gravity node repulsion/attraction
    mass: node => 4,
  
    // Coulomb's law coefficient
    // - Makes the nodes repel each other for negative values
    // - Makes the nodes attract each other for positive values
    gravity: -1.2,
  
    // A force that pulls nodes towards the origin (0, 0)
    // Higher values keep the components less spread out
    pull: 0.001,
  
    // Theta coefficient from Barnes-Hut simulation
    // - Value ranges on [0, 1]
    // - Performance is better with smaller values
    // - Very small values may not create enough force to give a good result
    theta: 0.666,
  
    // Friction / drag coefficient to make the system stabilise over time
    dragCoeff: 0.02,
  
    // When the total of the squared position deltas is less than this value, the simulation ends
    movementThreshold: 1,
  
    // The amount of time passed per tick
    // - Larger values result in faster runtimes but might spread things out too far
    // - Smaller values produce more accurate results
    timeStep: 20,
  
    // The number of ticks per frame for animate:true
    // - A larger value reduces rendering cost but can be jerky
    // - A smaller value increases rendering cost but is smoother
    refresh: 10,
  
    // Whether to animate the layout
    // - true : Animate while the layout is running
    // - false : Just show the end result
    // - 'end' : Animate directly to the end result
    animate: true,
  
    // Animation duration used for animate:'end'
    animationDuration: undefined,
  
    // Easing for animate:'end'
    animationEasing: undefined,
  
    // Maximum iterations and time (in ms) before the layout will bail out
    // - A large value may allow for a better result
    // - A small value may make the layout end prematurely
    // - The layout may stop before this if it has settled
    maxIterations: 1000,
    maxSimulationTime: 4000,
  
    // Prevent the user grabbing nodes during the layout (usually with animate:true)
    ungrabifyWhileSimulating: false,
  
    // Whether to fit the viewport to the repositioned graph
    // true : Fits at end of layout for animate:false or animate:'end'; fits on each frame for animate:true
    fit: true,
  
    // Padding in rendered co-ordinates around the layout
    padding: 30,
  
    // Constrain layout bounds with one of
    // - { x1, y1, x2, y2 }
    // - { x1, y1, w, h }
    // - undefined / null : Unconstrained
    boundingBox: undefined,
  
    // Layout event callbacks; equivalent to `layout.one('layoutready', callback)` for example
    ready: function(){}, // on layoutready
    stop: function(){}, // on layoutstop
  
    // Whether to randomize the initial positions of the nodes
    // true : Use random positions within the bounding box
    // false : Use the current node positions as the initial positions
    randomize: false
  },
  fcose: {
    name: "fcose",
    refresh: 30, // number of ticks per frame; higher is faster but more jerky

    // 'draft', 'default' or 'proof' 
    // - "draft" only applies spectral layout 
    // - "default" improves the quality with incremental layout (fast cooling rate)
    // - "proof" improves the quality with incremental layout (slow cooling rate) 
    quality: "default",
    // Use random node positions at beginning of layout
    // if this is set to false, then quality option must be "proof"
    randomize: false, 
    avoidOverlap: true, // prevents node overlap,
    // Whether or not to animate the layout
    animate: true, 
    // Duration of animation in ms, if enabled
    animationDuration: 2000, 
    // Easing of animation, if enabled
    animationEasing: undefined, 
    // Fit the viewport to the repositioned nodes
    fit: true, 
    // Padding around layout
    padding: 30,
    // Whether to include labels in node dimensions. Valid in "proof" quality
    nodeDimensionsIncludeLabels: true,
    // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
    uniformNodeDimensions: false,
    // Whether to pack disconnected components - cytoscape-layout-utilities extension should be registered and initialized
    packComponents: true,
    // Layout step - all, transformed, enforced, cose - for debug purpose only
    step: "all",
    
    /* spectral layout options */
    
    // False for random, true for greedy sampling
    samplingType: true,
    // Sample size to construct distance matrix
    sampleSize: 25,
    // Separation amount between nodes
    nodeSeparation: 40,
    // Power iteration tolerance
    piTol: 0.0000001,
    
    /* incremental layout options */
    
    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: 5000,
    // Ideal edge (non nested) length
    idealEdgeLength: edge => 50,
    // Divisor to compute edge forces
     edgeElasticity: edge => 0.45,
    // Nesting factor (multiplier) to compute ideal edge length for nested edges
    nestingFactor: 0.1,
    // Maximum number of iterations to perform - this is a suggested value and might be adjusted by the algorithm as required
    numIter: 3000,
    // For enabling tiling
    tile: false,
    // The comparison function to be used while sorting nodes during tiling operation.
    // Takes the ids of 2 nodes that will be compared as a parameter and the default tiling operation is performed when this option is not set.
    // It works similar to ``compareFunction`` parameter of ``Array.prototype.sort()``
    // If node1 is less then node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return a negative value
    // If node1 is greater then node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return a positive value
    // If node1 is equal to node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return 0
    tilingCompareBy: undefined, 
    // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingVertical: 10,
    // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingHorizontal: 10,
    // Gravity force (constant)
    gravity: 0.25,
    // Gravity range (constant) for compounds
    gravityRangeCompound: 1.5,
    // Gravity force (constant) for compounds
    gravityCompound: 1.0,
    // Gravity range (constant)
    gravityRange: 3.8, 
    // Initial cooling factor for incremental layout  
    initialEnergyOnIncremental: 0.3,
  
    /* constraint options */
  
    // Fix desired nodes to predefined positions
    // [{nodeId: 'n1', position: {x: 100, y: 200}}, {...}]
    fixedNodeConstraint: undefined,
    // Align desired nodes in vertical/horizontal direction
    // {vertical: [['n1', 'n2'], [...]], horizontal: [['n2', 'n4'], [...]]}
    alignmentConstraint: undefined,
    // Place two nodes relatively in vertical/horizontal direction
    // [{top: 'n1', bottom: 'n2', gap: 100}, {left: 'n3', right: 'n4', gap: 75}, {...}]
    relativePlacementConstraint: undefined,
  
    /* layout event callbacks */
    ready: () => {}, // on layoutready
    stop: () => {} // on layoutstop
  },
  cola: {
    name: "cola",
    animate: true, // whether to show the layout as it's running
    refresh: 1, // number of ticks per frame; higher is faster but more jerky
    maxSimulationTime: 2000, // max length in ms to run the layout
    ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
    fit: true, // on every layout reposition of nodes, fit the viewport
    padding: 30, // padding around the simulation
    boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node

    // layout event callbacks
    ready: function () {}, // on layoutready
    stop: function () {}, // on layoutstop

    // positioning options
    randomize: true, // use random node positions at beginning of layout
    avoidOverlap: true, // if true, prevents overlap of node bounding boxes
    handleDisconnected: true, // if true, avoids disconnected components from overlapping
    convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
    nodeSpacing: function (node) {
      return 40;
    }, // extra spacing around nodes
    flow: undefined, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
    alignment: undefined, // relative alignment constraints on nodes, e.g. {vertical: [[{node: node1, offset: 0}, {node: node2, offset: 5}]], horizontal: [[{node: node3}, {node: node4}], [{node: node5}, {node: node6}]]}
    gapInequalities: undefined, // list of inequality constraints for the gap between the nodes, e.g. [{"axis":"y", "left":node1, "right":node2, "gap":25}]
    centerGraph: true, // adjusts the node positions initially to center the graph (pass false if you want to start the layout from the current position)

    // different methods of specifying edge length
    // each can be a constant numerical value or a function like `function( edge ){ return 2; }`
    edgeLength: undefined, // sets edge length directly in simulation
    edgeSymDiffLength: undefined, // symmetric diff edge length in simulation
    edgeJaccardLength: undefined, // jaccard edge length in simulation

    // iterations of cola algorithm; uses default values on undefined
    unconstrIter: undefined, // unconstrained initial layout iterations
    userConstIter: undefined, // initial layout iterations with user-specified constraints
    allConstIter: undefined, // initial layout iterations with all constraints including non-overlap
  },
  dagre: {
    name: "dagre",
    // dagre algo options, uses default value on undefined
    nodeSep: undefined, // the separation between adjacent nodes in the same rank
    edgeSep: undefined, // the separation between adjacent edges in the same rank
    rankSep: undefined, // the separation between each rank in the layout
    rankDir: undefined, // 'TB' for top to bottom flow, 'LR' for left to right,
    align: undefined, // alignment for rank nodes. Can be 'UL', 'UR', 'DL', or 'DR', where U = up, D = down, L = left, and R = right
    acyclicer: undefined, // If set to 'greedy', uses a greedy heuristic for finding a feedback arc set for a graph.
    // A feedback arc set is a set of edges that can be removed to make a graph acyclic.
    ranker: "tight-tree", // Type of algorithm to assign a rank to each node in the input graph. Possible values: 'network-simplex', 'tight-tree' or 'longest-path'
    minLen: function (edge) {
      return 1;
    }, // number of ranks to keep between the source and target of the edge
    edgeWeight: function (edge) {
      return 1 + (edge.data().round || 0);
    }, // higher weight edges are generally made shorter and straighter than lower weight edges

    // general layout options
    fit: true, // whether to fit to viewport
    padding: 30, // fit padding
    spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
    nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
    animate: true, // whether to transition the node positions
    animateFilter: function (node, i) {
      return true;
    }, // whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
    animationDuration: 500, // duration of animation in ms if enabled
    animationEasing: undefined, // easing of animation if enabled
    boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    transform: function (node, pos) {
      return pos;
    }, // a function that applies a transform to the final node position
    ready: function () {}, // on layoutready
    sort: undefined, // a sorting function to order the nodes and edges; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
    // because cytoscape dagre creates a directed graph, and directed graphs use the node order as a tie breaker when
    // defining the topology of a graph, this sort function can help ensure the correct order of the nodes/edges.
    // this feature is most useful when adding and removing the same nodes and edges multiple times in a graph.
    stop: function () {}, // on layoutstop
  },
  klay: {
    name: "klay",
    nodeDimensionsIncludeLabels: false, // Boolean which changes whether label dimensions are included when calculating node dimensions
    fit: true, // Whether to fit
    padding: 20, // Padding on fit
    animate: false, // Whether to transition the node positions
    animateFilter: function (node, i) {
      return true;
    }, // Whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
    animationDuration: 500, // Duration of animation in ms if enabled
    animationEasing: undefined, // Easing of animation if enabled
    transform: function (node, pos) {
      return pos;
    }, // A function that applies a transform to the final node position
    ready: undefined, // Callback on layoutready
    stop: undefined, // Callback on layoutstop
    klay: {
      // Following descriptions taken from http://layout.rtsys.informatik.uni-kiel.de:9444/Providedlayout.html?algorithm=de.cau.cs.kieler.klay.layered
      addUnnecessaryBendpoints: false, // Adds bend points even if an edge does not change direction.
      aspectRatio: 1.6, // The aimed aspect ratio of the drawing, that is the quotient of width by height
      borderSpacing: 20, // Minimal amount of space to be left to the border
      compactComponents: false, // Tries to further compact components (disconnected sub-graphs).
      crossingMinimization: "LAYER_SWEEP", // Strategy for crossing minimization.
      /* LAYER_SWEEP The layer sweep algorithm iterates multiple times over the layers, trying to find node orderings that minimize the number of crossings. The algorithm uses randomization to increase the odds of finding a good result. To improve its results, consider increasing the Thoroughness option, which influences the number of iterations done. The Randomization seed also influences results.
        INTERACTIVE Orders the nodes of each layer by comparing their positions before the layout algorithm was started. The idea is that the relative order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive layer sweep algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
      cycleBreaking: "GREEDY", // Strategy for cycle breaking. Cycle breaking looks for cycles in the graph and determines which edges to reverse to break the cycles. Reversed edges will end up pointing to the opposite direction of regular edges (that is, reversed edges will point left if edges usually point right).
      /* GREEDY This algorithm reverses edges greedily. The algorithm tries to avoid edges that have the Priority property set.
        INTERACTIVE The interactive algorithm tries to reverse edges that already pointed leftwards in the input graph. This requires node and port coordinates to have been set to sensible values.*/
      direction: "DOWN", // Overall direction of edges: horizontal (right / left) or vertical (down / up)
      /* UNDEFINED, RIGHT, LEFT, DOWN, UP */
      edgeRouting: "ORTHOGONAL", // Defines how edges are routed (POLYLINE, ORTHOGONAL, SPLINES)
      edgeSpacingFactor: 0.5, // Factor by which the object spacing is multiplied to arrive at the minimal spacing between edges.
      feedbackEdges: false, // Whether feedback edges should be highlighted by routing around the nodes.
      fixedAlignment: "NONE", // Tells the BK node placer to use a certain alignment instead of taking the optimal result.  This option should usually be left alone.
      /* NONE Chooses the smallest layout from the four possible candidates.
        LEFTUP Chooses the left-up candidate from the four possible candidates.
        RIGHTUP Chooses the right-up candidate from the four possible candidates.
        LEFTDOWN Chooses the left-down candidate from the four possible candidates.
        RIGHTDOWN Chooses the right-down candidate from the four possible candidates.
        BALANCED Creates a balanced layout from the four possible candidates. */
      inLayerSpacingFactor: 1.0, // Factor by which the usual spacing is multiplied to determine the in-layer spacing between objects.
      layoutHierarchy: false, // Whether the selected layouter should consider the full hierarchy
      linearSegmentsDeflectionDampening: 0.3, // Dampens the movement of nodes to keep the diagram from getting too large.
      mergeEdges: false, // Edges that have no ports are merged so they touch the connected nodes at the same points.
      mergeHierarchyCrossingEdges: true, // If hierarchical layout is active, hierarchy-crossing edges use as few hierarchical ports as possible.
      nodeLayering: "NETWORK_SIMPLEX", // Strategy for node layering.
      /* NETWORK_SIMPLEX This algorithm tries to minimize the length of edges. This is the most computationally intensive algorithm. The number of iterations after which it aborts if it hasn't found a result yet can be set with the Maximal Iterations option.
        LONGEST_PATH A very simple algorithm that distributes nodes along their longest path to a sink node.
        INTERACTIVE Distributes the nodes into layers by comparing their positions before the layout algorithm was started. The idea is that the relative horizontal order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive node layering algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
      nodePlacement: "BRANDES_KOEPF", // Strategy for Node Placement
      /* BRANDES_KOEPF Minimizes the number of edge bends at the expense of diagram size: diagrams drawn with this algorithm are usually higher than diagrams drawn with other algorithms.
        LINEAR_SEGMENTS Computes a balanced placement.
        INTERACTIVE Tries to keep the preset y coordinates of nodes from the original layout. For dummy nodes, a guess is made to infer their coordinates. Requires the other interactive phase implementations to have run as well.
        SIMPLE Minimizes the area at the expense of... well, pretty much everything else. */
      randomizationSeed: 1, // Seed used for pseudo-random number generators to control the layout algorithm; 0 means a new seed is generated
      routeSelfLoopInside: false, // Whether a self-loop is routed around or inside its node.
      separateConnectedComponents: true, // Whether each connected component should be processed separately
      spacing: 10, // Overall setting for the minimal amount of space to be left between objects
      thoroughness: 7, // How much effort should be spent to produce a nice layout..
    },
    priority: function (edge) {
      return null;
    }, // Edges with a non-nil value are skipped when greedy edge cycle breaking is enabled
  },
};


function getGraphLayout(name) {
  return layoutMap[name];
}

const LAYOUT = "klay"
Cytoscape.use(klay);

interface GraphViewProps {
  data: any | null;
}

export default function CytoscapeView({ data }: GraphViewProps) {
  const {elements,classes} = dataToElements(data);
      
  useEffect(() => {
    Cytoscape.use(klay);
  }, []);
  const [cy, setCy] = useState(null);
  function init(cy) {
    console.log("init Cytoscape ")
    cy.on('drag', 'node', (evt)=>{
      // evt.cy.layout(getGraphLayout(LAYOUT)).run();
    });
    cy.on('dragfree', 'node', (evt)=>{
      evt.cy.$id(evt.target.id()).lock();
      evt.cy.layout(getGraphLayout(LAYOUT)).run();
    });
    
    cy.on('mousedown', 'node', (evt)=>{
      evt.cy.$id(evt.target.id()).unlock();
    });
  }
  return (
    <div id="cytoscape-container" style={{ width: '100%', height: '600px' }}>
      <CytoscapeComponent
          cy={(cy) => init(cy)}
          elements={elements}
          stylesheet={getGraphStylesheet()}
          layout={getGraphLayout(LAYOUT)}
          style={{ width: "1200px", height: "800px" }}
        />
    </div>
  );
}

function getGraphStylesheet() {
  let stylesheet = [
      {
        selector: ":selected",
        style: {
          borderWidth: "3px",
          borderOpacity: "50",
        },
      },
      {
        selector: "edge",
        style: {
          width: "1px",
          label: "data(label)",
          fontSize: "8px",
          fontWeight: "normal",
          textRotation: "autorotate",
          color: "white",
        },
      },
      {
        selector: "node",
        style: {
          label: "data(label)",
          color: "white",
          borderWidth: "1px",
          borderOpacity: "50",
          textValign: "center",
          textHalign: "center",
          textMaxWidth: "50px",
          textWrap: "wrap",
          width: "60px",
          height: "10px",
          fontSize: "8px"
        },
      },
      {
        selector: ".relation",
        style: {
          label:"",
          width: "10px",
          height: "10px",
          textValign: "top",
        },
      },
      {
          selector: ".main",
          style: {
          width: "80px",
          height: "80px"
          },
      },
      {
          selector: ".leaf",
          style: {
          width: "40px",
          height: "40px"
          },
      },
      {
        selector: ".reverse",
        style: {
          curveStyle: "bezier",
        },
      },
    ];
  // Add colors to stylesheet
  colors.forEach((color, index) => {
      stylesheet.push({
          selector: `.color${index}`,
          style: {
              backgroundColor: color,
          },
      });
  });
  return stylesheet;
  }


const colors = [
    "rgb(165, 137, 175)",
    "rgb(222, 164, 192)",
    "rgb(236, 202, 170)",
    "rgb(247, 237, 195)",
    "rgb(173, 225, 212)",
    "rgb(167, 187, 225)",
  ];
  function addEdge(elements,source,target,label) {
    if ((source != undefined) && (target != undefined)) {
      elements.push({ group: 'edges', data: { source: source, target: target, label: label } });
    }
  }
  function addGraph(elements,e, classname, classes, max) {
    var uid =  e['id'] || e['uid'] ;
    if (elements.length > max) {
      return undefined
    }
    // add classname to classes
    let color_class = classes.get(classname)
    if (color_class  == undefined) {
      color_class = "color" + classes.size % colors.length
      classes.set(classname, color_class)
    }
    if (uid != undefined) {
      var point = {};
      let n=0;
      let children = 0;
  
        
      for(var key in e) { 
        if ( (typeof e[key] == 'object') && (! key.startsWith("dgraph.")) )  {
          children += 1;
          if (Array.isArray(e[key])) {
            for (var child of e[key]) {
              var targetUid = addGraph(elements,child,key, classes,max);
              addEdge(elements,uid, targetUid, key)
            }
          } else {
            var targetUid = addGraph(elements,e[key],key, classes,max);
            addEdge(elements,uid, targetUid, key)
          }
        } else {
           point[key]=e[key];
           n+=1
        }
      }
      if (n == 1) {// this node has no properties
        classname = "relation"
      }
      if (children == 0) {
        classname = "leaf"
      }
      point['id'] = uid;
      point['label'] = point['label'] || point['name'] || point['title'] || uid
  
      elements.push({
        group:"nodes",
        data:point,
        classes: [classname, color_class],
        position: { x: 600.0*Math.random(), y: 600.0*Math.random() } }
      );
    }
    return uid;
  }
  function dataToElements( data ) {
    var elements = [];
    var classes = new Map();
  
    if (data) {
      
      for(var key in data) {
        if(data.hasOwnProperty(key)) {
      
          for (var e of data[key]) {
            addGraph(elements,e,"main",classes,100);
  
          }
          
        }
        //this.layout.run();
      }
      return {elements, classes}
    }
  }