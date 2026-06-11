import os
from neo4j import GraphDatabase

class Neo4jService:
    _driver = None
    _initialized = False

    @classmethod
    def get_driver(cls):
        if cls._driver is None:
            uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
            user = os.environ.get("NEO4J_USER", "neo4j")
            password = os.environ.get("NEO4J_PASSWORD", "password123")
            try:
                cls._driver = GraphDatabase.driver(uri, auth=(user, password))
                if not cls._initialized:
                    cls.initialize_schema()
            except Exception as e:
                print(f"Error connecting to Neo4j: {str(e)}")
        return cls._driver

    @classmethod
    def initialize_schema(cls):
        if cls._driver is None:
            return
        
        # Pre-register relationships by creating and deleting a dummy node
        query_create = """
        MERGE (u:User {id: -1})
        MERGE (p:Product {id: -1})
        MERGE (u)-[:VIEW]->(p)
        MERGE (u)-[:BUY]->(p)
        MERGE (u)-[:CLICK]->(p)
        MERGE (u)-[:ADD_CART]->(p)
        MERGE (p)-[:SIMILAR {score: 0.0}]->(p)
        """
        query_delete = """
        MATCH (u:User {id: -1}) DETACH DELETE u
        MATCH (p:Product {id: -1}) DETACH DELETE p
        """
        try:
            with cls._driver.session() as session:
                session.run(query_create)
                session.run(query_delete)
                cls._initialized = True
                print("Neo4j schema and relationship types pre-registered successfully.")
        except Exception as e:
            print(f"Warning: Failed to pre-register Neo4j schema: {str(e)}")

    @classmethod
    def close(cls):
        if cls._driver is not None:
            cls._driver.close()
            cls._driver = None
            cls._initialized = False

    @classmethod
    def test_connection(cls):
        driver = cls.get_driver()
        if not driver:
            return False
        try:
            with driver.session() as session:
                result = session.run("RETURN 1 AS num")
                record = result.single()
                return record["num"] == 1 if record else False
        except Exception as e:
            print(f"Neo4j connection test failed: {str(e)}")
            return False

    @classmethod
    def sync_product(cls, product_id, name):
        driver = cls.get_driver()
        if not driver:
            return
        query = """
        MERGE (p:Product {id: $product_id})
        SET p.name = $name
        """
        try:
            with driver.session() as session:
                session.run(query, product_id=int(product_id), name=name)
        except Exception as e:
            print(f"Neo4j sync_product error: {str(e)}")

    @classmethod
    def log_user_interaction(cls, user_id, product_id, action_type):
        driver = cls.get_driver()
        if not driver:
            return
        
        # Standardize action type to uppercase
        action = action_type.upper()
        if action == "ADD_TO_CART" or action == "ADDCART":
            action = "ADD_CART"

        query = f"""
        MERGE (u:User {{id: $user_id}})
        MERGE (p:Product {{id: $product_id}})
        MERGE (u)-[r:{action}]->(p)
        SET r.timestamp = timestamp()
        """
        try:
            with driver.session() as session:
                session.run(query, user_id=int(user_id), product_id=int(product_id))
        except Exception as e:
            print(f"Neo4j log_user_interaction error: {str(e)}")

    @classmethod
    def create_similarity_relationship(cls, p1_id, p2_id, score):
        driver = cls.get_driver()
        if not driver:
            return
        query = """
        MERGE (p1:Product {id: $p1_id})
        MERGE (p2:Product {id: $p2_id})
        MERGE (p1)-[r:SIMILAR]->(p2)
        SET r.score = $score
        """
        try:
            with driver.session() as session:
                session.run(query, p1_id=int(p1_id), p2_id=int(p2_id), score=float(score))
        except Exception as e:
            print(f"Neo4j create_similarity_relationship error: {str(e)}")

    @classmethod
    def get_graph_recommendations(cls, user_id, limit=10):
        driver = cls.get_driver()
        if not driver or not user_id:
            return []
        
        query = """
        MATCH (u:User {id: $user_id})-[r:VIEW|BUY|CLICK|ADD_CART]->(p:Product)-[s:SIMILAR]->(rec:Product)
        WHERE NOT (u)-[:VIEW|BUY|CLICK|ADD_CART]->(rec) AND rec.id <> p.id
        RETURN rec.id AS product_id, sum(s.score) AS graph_score
        ORDER BY graph_score DESC
        LIMIT $limit
        """
        try:
            with driver.session() as session:
                result = session.run(query, user_id=int(user_id), limit=int(limit))
                return [record.data() for record in result]
        except Exception as e:
            print(f"Neo4j get_graph_recommendations error: {str(e)}")
            return []

    @classmethod
    def get_similarity_score(cls, user_id, product_id):
        driver = cls.get_driver()
        if not driver or not user_id:
            return 0.0
        
        query = """
        MATCH (u:User {id: $user_id})-[r:VIEW|BUY|CLICK|ADD_CART]->(p:Product)-[s:SIMILAR]->(rec:Product {id: $product_id})
        RETURN sum(s.score) AS graph_score
        """
        try:
            with driver.session() as session:
                result = session.run(query, user_id=int(user_id), product_id=int(product_id))
                record = result.single()
                return record["graph_score"] if record and record["graph_score"] is not None else 0.0
        except Exception as e:
            print(f"Neo4j get_similarity_score error: {str(e)}")
            return 0.0
