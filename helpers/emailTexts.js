const {
  HOST,
} = process.env;

const permissionCreateSubject = (sharerName) => `${sharerName} shared a graph with you`;
const permissionCreateText = (sharerName, username, graphId) => `<html>
          <body>
           <p>Hi ${username}. ${sharerName} shared a graph with you. Open the link below to check it out</p>
           <a href="${HOST}graphs/view/${graphId}">Open the graph</a>
          </body>
         </html>`;

const permissionUpdateSubject = (sharerName) => `${sharerName} updated a graph permission for you`;
const permissionUpdateText = (sharerName, username, graphId) => `<html>
          <body>
           <p>Hi ${username}. ${sharerName} updated a graph which has been shared with you. Open the link below to check it out</p>
           <a href="${HOST}graphs/view/${graphId}">Open the graph</a>
          </body>
         </html>`;

const permissionDeleteSubject = (sharerName) => `${sharerName} removed a graph permission`;
const permissionDeleteText = (sharerName, username, graphId) => `<html>
          <body>
           <p>Hi ${username}. ${sharerName} removed your access for the graph with an id ${graphId}.</p>
          </body>
         </html>`;

const graphUpdatedSubject = (updatedBy) => `${updatedBy} updated a graph`;
const graphUpdatedText = (updatedBy, graphId) => `<html>
          <body>
           <p>Hi there. ${updatedBy} updated the graph with an id ${graphId}. Open the link below to check it out</p>
           <a href="${HOST}graphs/view/${graphId}">Open the graph</a>
          </body>
         </html>`;

export default {
  permissionCreateSubject,
  permissionCreateText,
  permissionUpdateSubject,
  permissionUpdateText,
  permissionDeleteSubject,
  permissionDeleteText,
  graphUpdatedSubject,
  graphUpdatedText,
};
