import { MessageNode, countAllMessages, countUnreadMessages } from '@casedata/services/casedata-message-service';
import React, { Fragment, useState } from 'react';
import { RenderedMessage } from './rendered-message.component';
import { Button, cx, Divider } from '@sk-web-gui/react';

interface MessageTreeProps {
  nodes: MessageNode[];
  selected: string;
  onSelect: (node: MessageNode) => void;
}

const getId = (node: MessageNode): string => node.emailHeaders?.find((h) => h.header === 'MESSAGE_ID')?.values?.[0];

const MessageNodeComponent: React.FC<{
  node: MessageNode;
  selected: string;
  onSelect: (node: MessageNode) => void;
  root?: boolean;
}> = ({ node, selected, onSelect, root = false }) => {
  const [showChildren, setShowChildren] = useState(true);

  return (
    <>
      <div className="m-md mr-0" id={`node-${getId(node)}`}>
        <RenderedMessage message={node} selected={selected} onSelect={onSelect} root={root}>
          {root && node.children?.length ? (
            <Button
              size="sm"
              className="text-small"
              variant="link"
              onClick={(e) => {
                e.preventDefault();
                setShowChildren(!showChildren);
              }}
            >
              {showChildren
                ? `Dölj svar`
                : `Visa svar (${countAllMessages(node.children)} varav ${countUnreadMessages(node.children)} ${
                    countUnreadMessages(node.children) === 1 ? 'oläst' : 'olästa'
                  })`}
            </Button>
          ) : null}
        </RenderedMessage>
        {showChildren && node.children && node.children.length > 0 && (
          <div className={cx(root ? 'border-l' : 'border-l')}>
            {node.children.map((child, idx) => (
              <MessageNodeComponent
                key={`${idx}-${getId(child)}`}
                node={child}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const MessageTreeComponent: React.FC<MessageTreeProps> = ({ nodes, selected, onSelect }) => {
  return (
    <div className="my-lg" data-cy="message-container">
      {nodes.map((node, idx) => (
        <Fragment key={`${idx}-${getId(node)}`}>
          <Divider />
          <MessageNodeComponent node={node} selected={selected} onSelect={onSelect} root={true} />
        </Fragment>
      ))}
    </div>
  );
};

export default MessageTreeComponent;
