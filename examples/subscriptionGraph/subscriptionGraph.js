import React from 'react';

import Graph from 'react-graph-vis';

export default ({graph}) => {
  const graphVisOptions = {
    layout: {
      hierarchical: true
    },
    edges: {
      color: "#000000"
    }
  };

  const graphVisEvents = {
    select: function(event) {
      const { nodes, edges } = event;
    }
  }

  return (
    <Graph style={{width:'100%', height:400}}
           graph={graph}
           options={graphVisOptions} events={graphVisEvents}
    />
  );
}